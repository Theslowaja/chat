const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
require('dotenv').config();

// Import configurations and services
const { testConnection, initializeDatabase, sequelize } = require('./config/database');
const { initializeFirebase } = require('./config/firebase');
const chatService = require('./services/chatService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store using PostgreSQL
const sessionStore = new SequelizeStore({
    db: sequelize,
    tableName: 'sessions',
    checkExpirationInterval: 15 * 60 * 1000, // Clean up expired sessions every 15 minutes
    expiration: 24 * 60 * 60 * 1000 // Session expires after 24 hours
});

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true in production with HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});

app.use(sessionMiddleware);

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users and default room
let connectedUsers = {};
let defaultRoom = null;

// Initialize application
async function initializeApp() {
    try {
        console.log('🚀 Starting SecureChat application...');
        
        // Test database connection
        await testConnection();
        
        // Initialize Firebase
        initializeFirebase();
        
        // Initialize database tables
        await initializeDatabase();
        
        // Create session store table
        await sessionStore.sync();
        
        // Get or create default room
        defaultRoom = await chatService.getOrCreateDefaultRoom();
        console.log('✅ Default room ready:', defaultRoom.name);
        
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        process.exit(1);
    }
}

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // Handle user joining
    socket.on('user joined', async (username) => {
        try {
            // Find user in database
            const { User } = require('./models');
            const user = await User.findOne({
                where: { username },
                attributes: ['id', 'username', 'avatar_url']
            });

            if (!user) {
                socket.emit('error', { message: 'User not found' });
                return;
            }

            connectedUsers[socket.id] = {
                id: socket.id,
                user_id: user.id,
                username: user.username,
                joinTime: new Date()
            };

            // Update user online status
            await chatService.updateUserOnlineStatus(user.id, true);
            
            // Join user to default room
            await chatService.joinUserToRoom(user.id, defaultRoom.id);
            
            // Send message history to new user
            const messages = await chatService.getRecentMessages(defaultRoom.id);
            const messageHistory = messages.map(msg => ({
                id: msg.id,
                username: msg.author.username,
                message: msg.content,
                timestamp: msg.created_at
            }));
            socket.emit('message history', messageHistory);
            
            // Notify all users about new user
            socket.broadcast.emit('user joined', {
                username: user.username,
                message: `${user.username} joined the chat`,
                timestamp: new Date()
            });
            
            // Send updated online users list
            const onlineUsers = await chatService.getOnlineUsers();
            const usersList = onlineUsers.map(u => ({
                id: u.id,
                username: u.username,
                avatar_url: u.avatar_url
            }));
            io.emit('users list', usersList);
            
            console.log(`${user.username} joined the chat`);
        } catch (error) {
            console.error('Error handling user join:', error);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    });

    // Handle new messages
    socket.on('new message', async (data) => {
        try {
            const socketUser = connectedUsers[socket.id];
            if (!socketUser) {
                socket.emit('error', { message: 'User not authenticated' });
                return;
            }

            // Create message in database and Firebase
            const message = await chatService.createMessage({
                content: data.message,
                user_id: socketUser.user_id,
                room_id: defaultRoom.id,
                type: 'text'
            });

            const messageData = {
                id: message.id,
                username: message.author.username,
                message: message.content,
                timestamp: message.created_at
            };
            
            // Broadcast message to all users
            io.emit('new message', messageData);
            console.log(`${socketUser.username}: ${data.message}`);
        } catch (error) {
            console.error('Error handling new message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        const user = connectedUsers[socket.id];
        if (user) {
            socket.broadcast.emit('user typing', {
                username: user.username,
                isTyping: data.isTyping
            });
        }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
        try {
            const user = connectedUsers[socket.id];
            if (user) {
                // Update user online status
                await chatService.updateUserOnlineStatus(user.user_id, false);
                
                delete connectedUsers[socket.id];
                
                // Notify all users about user leaving
                socket.broadcast.emit('user left', {
                    username: user.username,
                    message: `${user.username} left the chat`,
                    timestamp: new Date()
                });
                
                // Send updated online users list
                const onlineUsers = await chatService.getOnlineUsers();
                const usersList = onlineUsers.map(u => ({
                    id: u.id,
                    username: u.username,
                    avatar_url: u.avatar_url
                }));
                io.emit('users list', usersList);
                
                console.log(`${user.username} disconnected`);
            }
        } catch (error) {
            console.error('Error handling user disconnect:', error);
        }
    });
});

// API Endpoints for Authentication

// Register new user
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        // Basic validation
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters long' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Create user using ChatService
        const user = await chatService.createUser({ username, password, email });
        
        // Save user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        
        console.log(`New user registered: ${username}`);
        res.status(201).json({ success: true, username: user.username });
        
    } catch (error) {
        console.error('Registration error:', error);
        
        if (error.message.includes('username') && error.message.includes('unique')) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        
        if (error.message.includes('email') && error.message.includes('unique')) {
            return res.status(409).json({ error: 'Email already exists' });
        }
        
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Basic validation
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Authenticate user using ChatService
        const user = await chatService.authenticateUser(username, password);
        
        // Save user session
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        
        console.log(`User logged in: ${username}`);
        res.status(200).json({ success: true, username: user.username });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Check session status
app.get('/api/session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ authenticated: true, user: req.session.user });
    } else {
        res.status(200).json({ authenticated: false });
    }
});

// Logout user
app.post('/api/logout', async (req, res) => {
    try {
        if (req.session.user) {
            const username = req.session.user.username;
            const userId = req.session.user.id;
            
            // Update user online status
            await chatService.updateUserOnlineStatus(userId, false);
            
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destroy error:', err);
                    return res.status(500).json({ error: 'Logout failed' });
                }
                console.log(`User logged out: ${username}`);
                res.status(200).json({ success: true });
            });
        } else {
            res.status(200).json({ success: true });
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Always return the main app for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Cleanup job - run every 5 minutes
setInterval(async () => {
    try {
        await chatService.cleanupInactiveUsers();
    } catch (error) {
        console.error('Cleanup job error:', error);
    }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    try {
        await sequelize.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
});

// Initialize app and start server
initializeApp().then(() => {
    server.listen(PORT, () => {
        console.log(`🚀 Chat server is running on http://localhost:${PORT}`);
        console.log('📱 Ready to accept connections!');
    });
}).catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

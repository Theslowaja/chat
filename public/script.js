// Global variables
let socket;
let currentUsername = '';
let currentUser = null;
let typingTimer;
let isTyping = false;
let isAuthenticated = false;

// DOM elements
const authModal = document.getElementById('authModal');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authLoading = document.getElementById('authLoading');
const authError = document.getElementById('authError');
const errorText = document.getElementById('errorText');

// Auth form elements
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const registerUsername = document.getElementById('registerUsername');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const confirmPassword = document.getElementById('confirmPassword');

// Chat elements
const currentUsernameSpan = document.getElementById('currentUsername');
const messagesContainer = document.getElementById('messagesContainer');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const typingIndicator = document.getElementById('typingIndicator');
const typingText = document.getElementById('typingText');
const leaveButton = document.getElementById('leaveButton');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkAuthStatus();
});

// Authentication Functions
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            currentUsername = data.user.username;
            isAuthenticated = true;
            joinChat(currentUsername);
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showAuthModal();
    }
}

function showAuthModal() {
    authModal.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    loginUsername.focus();
}

function hideAuthModal() {
    authModal.classList.add('hidden');
    clearAuthForms();
    hideError();
    hideLoading();
}

function showLogin() {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authTitle.textContent = 'Welcome Back!';
    authSubtitle.textContent = 'Please login to continue';
    hideError();
    loginUsername.focus();
}

function showRegister() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authTitle.textContent = 'Join SecureChat';
    authSubtitle.textContent = 'Create your account to start chatting';
    hideError();
    registerUsername.focus();
}

function showLoading() {
    authLoading.classList.remove('hidden');
    const authBtns = document.querySelectorAll('.auth-btn');
    authBtns.forEach(btn => btn.disabled = true);
}

function hideLoading() {
    authLoading.classList.add('hidden');
    const authBtns = document.querySelectorAll('.auth-btn');
    authBtns.forEach(btn => btn.disabled = false);
}

function showError(message) {
    errorText.textContent = message;
    authError.classList.remove('hidden');
}

function hideError() {
    authError.classList.add('hidden');
    errorText.textContent = '';
}

function clearAuthForms() {
    loginForm.reset();
    registerForm.reset();
}

async function handleLogin(username, password) {
    try {
        showLoading();
        hideError();
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUsername = data.username;
            currentUser = { username: data.username };
            isAuthenticated = true;
            hideAuthModal();
            joinChat(currentUsername);
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
        console.error('Login error:', error);
    } finally {
        hideLoading();
    }
}

async function handleRegister(username, email, password, confirmPwd) {
    try {
        // Client-side validation
        if (password !== confirmPwd) {
            showError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
        
        if (username.length < 3) {
            showError('Username must be at least 3 characters long');
            return;
        }
        
        showLoading();
        hideError();
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUsername = data.username;
            currentUser = { username: data.username, email };
            isAuthenticated = true;
            hideAuthModal();
            joinChat(currentUsername);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
        console.error('Register error:', error);
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    try {
        if (socket) {
            socket.disconnect();
        }
        
        await fetch('/api/logout', { method: 'POST' });
        
        currentUser = null;
        currentUsername = '';
        isAuthenticated = false;
        
        chatContainer.classList.add('hidden');
        showAuthModal();
        showLogin();
        
        // Reset chat UI
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>Welcome to the Chat!</h3>
                <p>Start a conversation with other users</p>
            </div>
        `;
        usersList.innerHTML = '';
        userCount.textContent = '0';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function joinChat(username) {
    currentUsername = username;
    
    // Initialize socket connection
    socket = io();
    setupSocketListeners();
    
    // Join the chat
    socket.emit('user joined', username);
    
    // Update UI
    authModal.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    currentUsernameSpan.textContent = username;
    messageInput.focus();
    
    // Clear welcome message when user joins
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
}

function initializeEventListeners() {
    // Auth form switching
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });
    
    // Login form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        
        if (username && password) {
            handleLogin(username, password);
        }
    });
    
    // Register form submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = registerUsername.value.trim();
        const email = registerEmail.value.trim();
        const password = registerPassword.value;
        const confirmPwd = confirmPassword.value;
        
        if (username && email && password && confirmPwd) {
            handleRegister(username, email, password, confirmPwd);
        }
    });

    // Message form submission
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    // Typing detection
    messageInput.addEventListener('input', handleTyping);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Leave chat button (logout)
    leaveButton.addEventListener('click', handleLogout);

    // Enter key shortcuts
    loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
    
    confirmPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            registerForm.dispatchEvent(new Event('submit'));
        }
    });
}


function setupSocketListeners() {
    // Message history
    socket.on('message history', (messages) => {
        messages.forEach(message => {
            displayMessage(message);
        });
    });

    // New message
    socket.on('new message', (message) => {
        displayMessage(message);
    });

    // User joined
    socket.on('user joined', (data) => {
        displaySystemMessage(data.message);
    });

    // User left
    socket.on('user left', (data) => {
        displaySystemMessage(data.message);
    });

    // Users list update
    socket.on('users list', (users) => {
        updateUsersList(users);
    });

    // Typing indicators
    socket.on('user typing', (data) => {
        handleUserTyping(data);
    });

    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        displaySystemMessage('Connection lost. Trying to reconnect...');
    });

    socket.on('reconnect', () => {
        console.log('Reconnected to server');
        displaySystemMessage('Reconnected to chat');
        socket.emit('user joined', currentUsername);
    });
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message && socket) {
        socket.emit('new message', { message });
        messageInput.value = '';
        stopTyping();
        messageInput.focus();
    }
}

function displayMessage(messageData) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    const isOwnMessage = messageData.username === currentUsername;
    if (isOwnMessage) {
        messageDiv.classList.add('own');
    }

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = messageData.username.charAt(0).toUpperCase();

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'message-username';
    usernameSpan.textContent = messageData.username;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(messageData.timestamp);

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = messageData.message;

    headerDiv.appendChild(usernameSpan);
    headerDiv.appendChild(timeSpan);
    contentDiv.appendChild(headerDiv);
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

function displaySystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.textContent = message;
    messagesContainer.appendChild(systemDiv);
    scrollToBottom();
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;

    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'user-avatar';
        avatarDiv.textContent = user.username.charAt(0).toUpperCase();

        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.username;

        userDiv.appendChild(avatarDiv);
        userDiv.appendChild(nameSpan);
        usersList.appendChild(userDiv);
    });
}

function handleTyping() {
    if (!isTyping) {
        isTyping = true;
        socket.emit('typing', { isTyping: true });
    }

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        stopTyping();
    }, 1000);
}

function stopTyping() {
    if (isTyping) {
        isTyping = false;
        socket.emit('typing', { isTyping: false });
    }
}

function handleUserTyping(data) {
    if (data.isTyping) {
        typingText.textContent = `${data.username} is typing...`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
}


function scrollToBottom() {
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Function to check if user is near bottom of messages
function isNearBottom() {
    const threshold = 100; // pixels from bottom
    return messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - threshold;
}

// Auto-scroll only if user is near bottom (so we don't interrupt manual scrolling)
function conditionalScrollToBottom() {
    if (isNearBottom()) {
        scrollToBottom();
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isTyping) {
        stopTyping();
    }
});

// Handle window beforeunload
window.addEventListener('beforeunload', () => {
    if (socket && socket.connected) {
        socket.disconnect();
    }
});

# SecureChat - Real-Time Chat Website

A modern, secure, and mobile-friendly real-time chat application built with Node.js, Express, Socket.IO, and comprehensive authentication system.

## 🚀 New Features (Updated)

### 🔐 **Authentication System**
- **User Registration** - Create secure accounts with email validation
- **Login/Logout** - Secure session management
- **Password Protection** - Hashed passwords for security
- **Session Persistence** - Stay logged in between visits
- **Demo Account** - Try with username: `demo`, password: `demo123`

### 📱 **Mobile-First Design**
- **Fully Responsive** - Optimized for all screen sizes (phones, tablets, desktop)
- **Touch-Friendly** - Large tap targets and smooth mobile interactions
- **iOS Safari Compatible** - Prevents zoom on input focus
- **Mobile Keyboard Support** - Smart keyboard handling
- **Landscape Mode** - Optimized layout for horizontal orientation

### 💬 **Chat Features**
- **Real-time messaging** - Instant message delivery using WebSocket technology
- **User management** - See who's online and track user activities
- **Typing indicators** - Know when someone is typing
- **Message history** - View recent messages when joining (last 100 messages)
- **User avatars** - Colorful avatar initials for easy identification
- **System notifications** - Join/leave notifications
- **Auto-reconnect** - Automatic reconnection on network issues

## Technologies Used

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with modern design principles
- **Icons**: Font Awesome
- **Fonts**: Google Fonts (Roboto)

## Installation & Setup

1. **Clone or download this project**
   ```bash
   cd chat-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### 🔑 **Authentication**

**First Time Users (Register):**
1. Click "Register here" on the login screen
2. Fill in:
   - Username (minimum 3 characters)
   - Email address
   - Password (minimum 6 characters)
   - Confirm password
3. Click "Register" - you'll be automatically logged in

**Existing Users (Login):**
1. Enter your username and password
2. Click "Login" or press Enter
3. You'll be taken directly to the chat

**Quick Demo:**
- Use the demo account: username `demo`, password `demo123`

### 💬 **Chatting**

1. **Start Chatting**
   - Type your message in the input field at the bottom
   - Press Enter or click the send button (paper plane icon)
   - See real-time messages from other users
   - Your messages appear on the right (blue), others on the left (gray)

2. **Mobile Usage**
   - Swipe horizontally to see online users on mobile
   - Tap message input to bring up keyboard
   - Interface automatically adjusts for mobile screens

3. **Features to Try**
   - Open multiple browser tabs/devices to simulate multiple users
   - Watch typing indicators when someone else is typing
   - See the user list update as people join and leave
   - Check message timestamps and user avatars
   - Try logging out and back in - your session will be remembered

4. **Logout**
   - Click the "Leave" button in the top right
   - You'll be logged out and returned to the login screen

## Project Structure

```
chat-website/
├── server.js              # Express server with Socket.IO
├── package.json           # Dependencies and scripts
├── public/                # Static files served to clients
│   ├── index.html        # Main HTML page
│   ├── style.css         # CSS styling
│   └── script.js         # Client-side JavaScript
└── README.md             # This file
```

## Customization

### Changing the Port
Set the `PORT` environment variable or modify `server.js`:
```bash
PORT=4000 npm start
```

### Styling
Edit `public/style.css` to customize colors, fonts, and layout.

### Features
Modify `server.js` for server-side changes and `public/script.js` for client-side functionality.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Development Tips

- Use browser developer tools to inspect WebSocket connections
- Check the server console for connection logs
- Test with multiple browser windows/tabs for multi-user simulation
- The app automatically handles reconnections on network issues

## Deployment

### Local Network Access
To allow access from other devices on your network:
```bash
# Find your IP address
ipconfig

# Start server (it will be accessible at http://YOUR_IP:3000)
npm start
```

### Production Deployment
For production deployment, consider:
- Using a process manager like PM2
- Setting up a reverse proxy with Nginx
- Adding HTTPS support
- Implementing user authentication
- Adding rate limiting and security measures

## Security Considerations

This is a basic chat application for demonstration purposes. For production use, consider adding:
- Input sanitization and validation
- Rate limiting for messages
- User authentication and authorization
- Message encryption
- Content moderation
- HTTPS enforcement

## Contributing

Feel free to fork this project and submit pull requests for improvements!

## License

MIT License - feel free to use this code for learning and personal projects.

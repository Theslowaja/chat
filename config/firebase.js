// MySQL utilities (Firebase functionality removed)
require('dotenv').config();

// MySQL utility functions (replacing Firebase functions)
const mysqlUtils = {
    // Generate unique ID for messages
    generateMessageId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    },

    // Format timestamp for MySQL
    formatTimestamp(date = new Date()) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
    },

    // Sanitize input for MySQL
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        return input.replace(/[<>"'%;()&+]/g, '');
    },

    // Generate avatar URL based on username
    generateAvatarUrl(username) {
        const colors = ['FF6B6B', '4ECDC4', '45B7D1', '96CEB4', 'FFEAA7', 'DDA0DD', 'FF7F7F'];
        const colorIndex = username.charCodeAt(0) % colors.length;
        const bgColor = colors[colorIndex];
        const initial = username.charAt(0).toUpperCase();
        
        return `https://ui-avatars.com/api/?name=${initial}&background=${bgColor}&color=fff&size=100`;
    },

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Generate session ID
    generateSessionId() {
        return require('crypto').randomBytes(32).toString('hex');
    }
};

// Initialize function (no longer needed for Firebase)
function initializeServices() {
    console.log('✅ MySQL utilities initialized successfully');
    return true;
}

module.exports = {
    initializeServices,
    mysqlUtils
};

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection with SQLite fallback for development
let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
    // PostgreSQL for production
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true
        }
    });
} else {
    // SQLite for development/testing
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './chat.db', // SQLite file path
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true
        }
    });
}

// Test database connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection has been established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message);
        process.exit(1);
    }
}

// Initialize database
async function initializeDatabase() {
    try {
        await sequelize.sync({ 
            force: false, // Set to true only for development if you want to recreate tables
            alter: process.env.NODE_ENV === 'development' // Automatically alter tables in development
        });
        console.log('✅ Database models synced successfully.');
    } catch (error) {
        console.error('❌ Error syncing database models:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    testConnection,
    initializeDatabase
};

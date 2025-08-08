const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection with MySQL
let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
    // MySQL from DATABASE_URL
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'mysql',
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
        },
        dialectOptions: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        }
    });
} else {
    // MySQL from individual environment variables
    sequelize = new Sequelize(
        process.env.DB_NAME || 'chatdb',
        process.env.DB_USER || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            dialect: 'mysql',
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
            },
            dialectOptions: {
                charset: 'utf8mb4',
                collate: 'utf8mb4_unicode_ci'
            }
        }
    );
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

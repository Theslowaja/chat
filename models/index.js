const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// User Model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50],
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    firebase_uid: {
        type: DataTypes.STRING(128),
        allowNull: true,
        unique: true
    },
    avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        defaultValue: 'active'
    },
    last_seen: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    is_online: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    indexes: [
        { fields: ['username'] },
        { fields: ['email'] },
        { fields: ['firebase_uid'] },
        { fields: ['status'] },
        { fields: ['is_online'] }
    ]
});

// Room Model (for different chat rooms)
const Room = sequelize.define('Room', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
            len: [1, 100],
            notEmpty: true
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('public', 'private', 'direct'),
        defaultValue: 'public'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    max_members: {
        type: DataTypes.INTEGER,
        defaultValue: null // null means no limit
    }
}, {
    tableName: 'rooms',
    indexes: [
        { fields: ['name'] },
        { fields: ['type'] },
        { fields: ['created_by'] },
        { fields: ['is_active'] }
    ]
});

// Message Model
const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            len: [1, 2000],
            notEmpty: true
        }
    },
    type: {
        type: DataTypes.ENUM('text', 'image', 'file', 'system'),
        defaultValue: 'text'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Room,
            key: 'id'
        }
    },
    reply_to_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'messages', // Self reference
            key: 'id'
        }
    },
    edited_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    firebase_message_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'messages',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['room_id'] },
        { fields: ['created_at'] },
        { fields: ['type'] },
        { fields: ['is_deleted'] },
        { fields: ['firebase_message_id'] }
    ]
});

// UserRoom Model (Many-to-Many relationship between Users and Rooms)
const UserRoom = sequelize.define('UserRoom', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User,
            key: 'id'
        }
    },
    room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: Room,
            key: 'id'
        }
    },
    role: {
        type: DataTypes.ENUM('member', 'moderator', 'admin'),
        defaultValue: 'member'
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_read_message_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Message,
            key: 'id'
        }
    }
}, {
    tableName: 'user_rooms',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['room_id'] },
        { fields: ['role'] },
        { fields: ['is_active'] },
        { unique: true, fields: ['user_id', 'room_id'] }
    ]
});

// Define Associations
// User associations
User.hasMany(Message, { foreignKey: 'user_id', as: 'messages' });
User.hasMany(Room, { foreignKey: 'created_by', as: 'created_rooms' });
User.belongsToMany(Room, { through: UserRoom, foreignKey: 'user_id', as: 'rooms' });

// Room associations
Room.hasMany(Message, { foreignKey: 'room_id', as: 'messages' });
Room.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Room.belongsToMany(User, { through: UserRoom, foreignKey: 'room_id', as: 'members' });

// Message associations
Message.belongsTo(User, { foreignKey: 'user_id', as: 'author' });
Message.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
Message.belongsTo(Message, { foreignKey: 'reply_to_id', as: 'reply_to' });

// UserRoom associations
UserRoom.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserRoom.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
UserRoom.belongsTo(Message, { foreignKey: 'last_read_message_id', as: 'last_read_message' });

module.exports = {
    User,
    Room,
    Message,
    UserRoom,
    sequelize
};

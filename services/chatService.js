const { User, Room, Message, UserRoom } = require('../models');
const { getFirestore } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class ChatService {
    constructor() {
        this.db = getFirestore();
    }

    // User Management
    async createUser(userData) {
        try {
            const { username, email, password, firebase_uid } = userData;
            
            // Hash password
            const password_hash = await bcrypt.hash(password, 12);
            
            // Create user in PostgreSQL
            const user = await User.create({
                username,
                email,
                password_hash,
                firebase_uid,
                status: 'active'
            });

            // Sync with Firebase Firestore
            if (this.db) {
                await this.db.collection('users').doc(user.id).set({
                    username: user.username,
                    email: user.email,
                    firebase_uid: firebase_uid || null,
                    status: user.status,
                    created_at: user.created_at,
                    last_seen: user.last_seen,
                    is_online: false
                });
            }

            // Return user without password
            const { password_hash: _, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
    }

    async authenticateUser(username, password) {
        try {
            const user = await User.findOne({
                where: {
                    [Op.or]: [
                        { username },
                        { email: username }
                    ],
                    status: 'active'
                }
            });

            if (!user) {
                throw new Error('User not found or inactive');
            }

            const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                throw new Error('Invalid password');
            }

            // Update last seen and online status
            await this.updateUserOnlineStatus(user.id, true);

            const { password_hash: _, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;
        } catch (error) {
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    async updateUserOnlineStatus(userId, isOnline) {
        try {
            const updateData = {
                is_online: isOnline,
                last_seen: new Date()
            };

            // Update in PostgreSQL
            await User.update(updateData, {
                where: { id: userId }
            });

            // Update in Firebase
            if (this.db) {
                await this.db.collection('users').doc(userId).update({
                    is_online: isOnline,
                    last_seen: new Date()
                });
            }

            return true;
        } catch (error) {
            console.error('Error updating user online status:', error);
            return false;
        }
    }

    // Room Management
    async getOrCreateDefaultRoom() {
        try {
            let room = await Room.findOne({
                where: {
                    name: 'General',
                    type: 'public',
                    is_active: true
                }
            });

            if (!room) {
                // Create default admin user if not exists
                let adminUser = await User.findOne({
                    where: { username: 'admin' }
                });

                if (!adminUser) {
                    adminUser = await User.create({
                        username: 'admin',
                        email: 'admin@chatapp.com',
                        password_hash: await bcrypt.hash('admin123', 12),
                        status: 'active'
                    });
                }

                room = await Room.create({
                    name: 'General',
                    description: 'Default public chat room',
                    type: 'public',
                    created_by: adminUser.id,
                    is_active: true
                });

                // Sync with Firebase
                if (this.db) {
                    await this.db.collection('rooms').doc(room.id).set({
                        name: room.name,
                        description: room.description,
                        type: room.type,
                        created_by: room.created_by,
                        is_active: room.is_active,
                        created_at: room.created_at
                    });
                }
            }

            return room;
        } catch (error) {
            throw new Error(`Failed to get or create default room: ${error.message}`);
        }
    }

    async joinUserToRoom(userId, roomId) {
        try {
            const existingUserRoom = await UserRoom.findOne({
                where: { user_id: userId, room_id: roomId }
            });

            if (!existingUserRoom) {
                await UserRoom.create({
                    user_id: userId,
                    room_id: roomId,
                    role: 'member',
                    is_active: true
                });
            } else if (!existingUserRoom.is_active) {
                await existingUserRoom.update({ is_active: true });
            }

            return true;
        } catch (error) {
            console.error('Error joining user to room:', error);
            return false;
        }
    }

    // Message Management
    async createMessage(messageData) {
        try {
            const { content, user_id, room_id, type = 'text' } = messageData;

            // Create message in PostgreSQL
            const message = await Message.create({
                content,
                user_id,
                room_id,
                type
            });

            // Get message with user info
            const messageWithUser = await Message.findByPk(message.id, {
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'avatar_url']
                }]
            });

            // Sync with Firebase Firestore
            if (this.db) {
                const firebaseMessage = {
                    id: message.id,
                    content: message.content,
                    type: message.type,
                    user_id: message.user_id,
                    room_id: message.room_id,
                    username: messageWithUser.author.username,
                    created_at: message.created_at,
                    updated_at: message.updated_at
                };

                const docRef = await this.db.collection('messages').add(firebaseMessage);
                
                // Update PostgreSQL with Firebase message ID
                await message.update({ firebase_message_id: docRef.id });
                messageWithUser.firebase_message_id = docRef.id;
            }

            return messageWithUser;
        } catch (error) {
            throw new Error(`Failed to create message: ${error.message}`);
        }
    }

    async getRecentMessages(roomId, limit = 100) {
        try {
            const messages = await Message.findAll({
                where: {
                    room_id: roomId,
                    is_deleted: false
                },
                include: [{
                    model: User,
                    as: 'author',
                    attributes: ['id', 'username', 'avatar_url']
                }],
                order: [['created_at', 'ASC']],
                limit
            });

            return messages;
        } catch (error) {
            throw new Error(`Failed to get recent messages: ${error.message}`);
        }
    }

    async getOnlineUsers(roomId = null) {
        try {
            const whereClause = {
                is_online: true,
                status: 'active'
            };

            let users;
            if (roomId) {
                // Get online users in specific room
                users = await User.findAll({
                    where: whereClause,
                    include: [{
                        model: Room,
                        as: 'rooms',
                        where: { id: roomId },
                        through: {
                            where: { is_active: true }
                        },
                        required: true
                    }],
                    attributes: ['id', 'username', 'avatar_url', 'last_seen']
                });
            } else {
                // Get all online users
                users = await User.findAll({
                    where: whereClause,
                    attributes: ['id', 'username', 'avatar_url', 'last_seen']
                });
            }

            return users;
        } catch (error) {
            throw new Error(`Failed to get online users: ${error.message}`);
        }
    }

    // Firebase real-time sync methods
    async syncMessageToFirebase(message) {
        if (!this.db) return null;

        try {
            const firebaseMessage = {
                id: message.id,
                content: message.content,
                type: message.type,
                user_id: message.user_id,
                room_id: message.room_id,
                username: message.author?.username,
                created_at: message.created_at,
                updated_at: message.updated_at
            };

            await this.db.collection('messages').doc(message.id).set(firebaseMessage, { merge: true });
            return true;
        } catch (error) {
            console.error('Error syncing message to Firebase:', error);
            return false;
        }
    }

    async syncUserStatusToFirebase(userId, status) {
        if (!this.db) return null;

        try {
            await this.db.collection('users').doc(userId).update({
                is_online: status.is_online,
                last_seen: status.last_seen || new Date()
            });
            return true;
        } catch (error) {
            console.error('Error syncing user status to Firebase:', error);
            return false;
        }
    }

    // Cleanup methods
    async cleanupInactiveUsers() {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            await User.update(
                { is_online: false },
                {
                    where: {
                        is_online: true,
                        last_seen: {
                            [Op.lt]: fiveMinutesAgo
                        }
                    }
                }
            );

            console.log('✅ Cleaned up inactive users');
        } catch (error) {
            console.error('❌ Error cleaning up inactive users:', error);
        }
    }
}

module.exports = new ChatService();

# SecureChat Setup Guide

## 🚀 Quick Start (Development)

Untuk pengembangan lokal, aplikasi akan menggunakan SQLite dan berjalan tanpa Firebase:

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm start
```

Aplikasi akan berjalan di `http://localhost:3000` dengan database SQLite lokal.

## 🗄️ PostgreSQL Setup (Production)

### 1. Install PostgreSQL

**Windows:**
- Download dari https://www.postgresql.org/download/windows/
- Install dengan pengaturuan default
- Catat username dan password yang dibuat

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 2. Create Database

```sql
-- Masuk ke PostgreSQL
psql -U postgres

-- Buat database
CREATE DATABASE chatdb;

-- Buat user (optional)
CREATE USER chatuser WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE chatdb TO chatuser;
```

### 3. Update Environment Variables

Copy `.env.example` ke `.env` dan update:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/chatdb
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatdb
DB_USER=your-username
DB_PASSWORD=your-password
```

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Kunjungi [Firebase Console](https://console.firebase.google.com/)
2. Klik "Add project" atau "Create a project"
3. Masukkan nama project: `securechat-app` (atau nama lain)
4. Disable Google Analytics (opsional untuk chat app)
5. Klik "Create project"

### 2. Setup Firestore Database

1. Di Firebase Console, klik "Firestore Database"
2. Klik "Create database"
3. Pilih "Start in test mode" (untuk development)
4. Pilih lokasi server (pilih yang terdekat dengan users)
5. Klik "Done"

### 3. Setup Firebase Admin SDK

1. Di Firebase Console, klik gear icon → "Project settings"
2. Klik tab "Service accounts"
3. Klik "Generate new private key"
4. Download file JSON yang dihasilkan
5. Simpan file tersebut dengan nama `firebase-service-account.json`

### 4. Configure Environment Variables

Dari file JSON yang di-download, copy informasi berikut ke `.env`:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour actual private key content here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**⚠️ PENTING:** 
- Private key harus dalam format string dengan `\n` untuk newlines
- Jangan commit file `.env` ke git
- Tambahkan `.env` ke `.gitignore`

## 📁 Project Structure

```
chat-website/
├── config/
│   ├── database.js          # Database configuration
│   └── firebase.js          # Firebase Admin SDK setup
├── models/
│   └── index.js             # Sequelize models (User, Room, Message, etc.)
├── services/
│   └── chatService.js       # Business logic & Firebase integration
├── public/                  # Frontend files
├── .env                     # Environment variables (tidak di-commit)
├── .env.example             # Template environment variables
└── server.js                # Main server file
```

## 🔧 Configuration Options

### Database Options

1. **SQLite (Development)**: Otomatis digunakan jika PostgreSQL tidak dikonfigurasi
2. **PostgreSQL (Production)**: Untuk production dengan performa tinggi
3. **Cloud PostgreSQL**: Heroku Postgres, AWS RDS, Google Cloud SQL

### Firebase Options

1. **Disabled (Development)**: Aplikasi berjalan tanpa Firebase
2. **Firestore (Production)**: Real-time sync dengan Firebase Firestore
3. **Firebase Auth**: Dapat diintegrasikan untuk authentication

## 📊 Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `username` (String, Unique)
- `email` (String, Unique)
- `password_hash` (String)
- `firebase_uid` (String, Optional)
- `avatar_url` (String, Optional)
- `status` (Enum: active, inactive, banned)
- `last_seen` (Timestamp)
- `is_online` (Boolean)

### Messages Table
- `id` (UUID, Primary Key)
- `content` (Text)
- `type` (Enum: text, image, file, system)
- `user_id` (Foreign Key → Users)
- `room_id` (Foreign Key → Rooms)
- `firebase_message_id` (String, Optional)
- `created_at` (Timestamp)

### Rooms Table
- `id` (UUID, Primary Key)
- `name` (String)
- `description` (Text)
- `type` (Enum: public, private, direct)
- `created_by` (Foreign Key → Users)
- `is_active` (Boolean)

## 🚀 Deployment

### Heroku Deployment

```bash
# Install Heroku CLI
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-production-secret
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_PRIVATE_KEY="your-private-key"
heroku config:set FIREBASE_CLIENT_EMAIL=your-service-account-email

# Deploy
git push heroku main
```

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://... (auto-set by Heroku Postgres)
SESSION_SECRET=your-very-secure-random-secret
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

## 🛠️ Development Tips

1. **Hot Reload**: Gunakan `npm run dev` untuk auto-restart saat development
2. **Database Reset**: Set `force: true` di `initializeDatabase()` untuk reset tables
3. **Logging**: Set `NODE_ENV=development` untuk detailed logs
4. **Testing**: Gunakan SQLite untuk testing cepat

## 🔒 Security Notes

1. Jangan commit `.env` file
2. Gunakan strong session secrets di production
3. Enable HTTPS di production
4. Implement rate limiting untuk API endpoints
5. Sanitize user input
6. Use Firebase security rules untuk Firestore

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U username -d chatdb -h localhost

# Check if PostgreSQL is running
sudo service postgresql status
```

### Firebase Issues
```bash
# Verify Firebase credentials
node -e "console.log(JSON.parse(process.env.FIREBASE_PRIVATE_KEY || '{}'))"
```

### Common Errors
1. **"relation does not exist"**: Run `npm start` untuk create tables
2. **Firebase auth error**: Check private key formatting
3. **Session store error**: Ensure PostgreSQL is running

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/register` - Register new user
- `POST /api/login` - Login user  
- `GET /api/session` - Check login status
- `POST /api/logout` - Logout user

### Socket.IO Events
- `user joined` - User joins chat
- `new message` - Send/receive messages
- `typing` - Typing indicators
- `users list` - Online users update
- `disconnect` - User leaves chat

## ✨ Features

- ✅ Real-time messaging dengan Socket.IO
- ✅ User authentication dengan bcrypt
- ✅ Session persistence dengan PostgreSQL
- ✅ Firebase Firestore integration
- ✅ SQLite fallback untuk development
- ✅ Mobile-responsive design
- ✅ Typing indicators
- ✅ Online user tracking
- ✅ Message history
- ✅ Auto-cleanup inactive users

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
function initializeFirebase() {
    try {
        // Check if already initialized
        if (admin.apps.length === 0) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key: privateKey,
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
            };

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
            
            console.log('✅ Firebase Admin SDK initialized successfully');
        }
        
        return admin;
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error.message);
        // Don't exit process, continue without Firebase if needed
        return null;
    }
}

// Get Firestore database instance
function getFirestore() {
    try {
        const firebaseAdmin = initializeFirebase();
        if (firebaseAdmin) {
            return firebaseAdmin.firestore();
        }
        return null;
    } catch (error) {
        console.error('❌ Error getting Firestore instance:', error.message);
        return null;
    }
}

// Firebase utility functions
const firebaseUtils = {
    // Verify Firebase ID token
    async verifyIdToken(idToken) {
        try {
            const firebaseAdmin = initializeFirebase();
            if (!firebaseAdmin) return null;
            
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            return decodedToken;
        } catch (error) {
            console.error('Error verifying Firebase ID token:', error);
            return null;
        }
    },

    // Create custom token
    async createCustomToken(uid, additionalClaims = {}) {
        try {
            const firebaseAdmin = initializeFirebase();
            if (!firebaseAdmin) return null;
            
            const customToken = await firebaseAdmin.auth().createCustomToken(uid, additionalClaims);
            return customToken;
        } catch (error) {
            console.error('Error creating custom token:', error);
            return null;
        }
    },

    // Get user by UID
    async getUserByUid(uid) {
        try {
            const firebaseAdmin = initializeFirebase();
            if (!firebaseAdmin) return null;
            
            const userRecord = await firebaseAdmin.auth().getUser(uid);
            return userRecord;
        } catch (error) {
            console.error('Error getting user by UID:', error);
            return null;
        }
    }
};

module.exports = {
    initializeFirebase,
    getFirestore,
    firebaseUtils,
    admin
};

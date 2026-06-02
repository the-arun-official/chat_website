import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Graceful initialization so it doesn't crash if credentials aren't set yet
try {
  if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID !== 'your_project_id') {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace \\n with actual newlines for the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } else {
    console.warn('⚠️ Firebase credentials not set. Push notifications disabled.');
  }
} catch (error: any) {
  console.warn(`⚠️ Firebase Admin initialization failed: ${error.message}`);
}

export const firebaseAdmin = admin;

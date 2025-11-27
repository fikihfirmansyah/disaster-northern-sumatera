import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
let app: App | undefined;
let db: Firestore | undefined;

if (!getApps().length) {
  // Initialize with service account if available, otherwise use default credentials
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Initialize with project ID
      app = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      // Use default credentials (for Firebase hosting/Cloud Functions)
      // This will work if running on Firebase or with GOOGLE_APPLICATION_CREDENTIALS env var
      app = initializeApp();
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    // Don't throw - allow app to continue without Firebase
    app = undefined;
  }
} else {
  app = getApps()[0];
}

if (app) {
  try {
    db = getFirestore(app);
  } catch (error) {
    console.error('Error getting Firestore:', error);
    db = undefined;
  }
}

export { db };
export default db;


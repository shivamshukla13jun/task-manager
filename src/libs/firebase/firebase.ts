import admin from 'firebase-admin';
import serviceAccount from './firebase-adminsdk.json';

// Initialize Firebase Admin only if it hasn't been initialized
function initializeFirebase(): admin.app.App {
  try {
    return admin.app();
  } catch {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
    });
  }
}

const firebaseApp = initializeFirebase();

export { admin, firebaseApp };

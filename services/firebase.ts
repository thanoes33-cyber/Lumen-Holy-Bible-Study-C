import { initializeApp } from "firebase/app";
import { getAuth, deleteUser } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch, query } from "firebase/firestore";

// ------------------------------------------------------------------
// FIREBASE CONFIGURATION
// ------------------------------------------------------------------

// Helper to get env vars safely in Vite or other environments
const getEnv = (key: string, viteKey: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key] || import.meta.env[viteKey];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Helper to get stored config from LocalStorage (allows runtime config)
const getStoredConfig = () => {
    try {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('lumen_firebase_config');
            return stored ? JSON.parse(stored) : null;
        }
    } catch (e) {
        console.warn("Error reading stored config", e);
    }
    return null;
};

const storedConfig = getStoredConfig();

const firebaseConfig = {
  apiKey: storedConfig?.apiKey || getEnv('FIREBASE_API_KEY', 'VITE_FIREBASE_API_KEY') || "YOUR_API_KEY_HERE",
  authDomain: storedConfig?.authDomain || getEnv('FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_AUTH_DOMAIN') || "YOUR_AUTH_DOMAIN_HERE",
  projectId: storedConfig?.projectId || getEnv('FIREBASE_PROJECT_ID', 'VITE_FIREBASE_PROJECT_ID') || "YOUR_PROJECT_ID_HERE",
  storageBucket: storedConfig?.storageBucket || getEnv('FIREBASE_STORAGE_BUCKET', 'VITE_FIREBASE_STORAGE_BUCKET') || "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: storedConfig?.messagingSenderId || getEnv('FIREBASE_MESSAGING_SENDER_ID', 'VITE_FIREBASE_MESSAGING_SENDER_ID') || "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: storedConfig?.appId || getEnv('FIREBASE_APP_ID', 'VITE_FIREBASE_APP_ID') || "YOUR_APP_ID_HERE"
};

// Helper to check if config is valid (for UI warning purposes)
export const isFirebaseConfigValid = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
    firebaseConfig.authDomain !== "YOUR_AUTH_DOMAIN_HERE" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID_HERE"
  );
};

// Initialize Firebase conditionally
let app;
let auth: any = null;
let db: any = null;

try {
  // Only initialize if we have a somewhat valid config structure or during build
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase initialization warning:", e);
}

// Function to delete all user data and the account
export const deleteUserData = async (userId: string) => {
  if (!db || !auth || !auth.currentUser) return;

  try {
    // 1. Delete Subcollections (Firestore doesn't auto-delete subcollections)
    const subcollections = ['chats', 'favorites', 'prayers', 'logs'];
    
    for (const subCol of subcollections) {
      const q = query(collection(db, 'users', userId, subCol));
      const snapshot = await getDocs(q);
      
      // Batch delete for efficiency
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // 2. Delete the User Document itself
    await deleteDoc(doc(db, 'users', userId));

    // 3. Delete the Authentication User
    await deleteUser(auth.currentUser);
    
  } catch (error: any) {
    console.error("Error deleting user data:", error);
    throw error;
  }
};

// Export services
export { auth, db };
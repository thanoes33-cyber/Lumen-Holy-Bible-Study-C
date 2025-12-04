import { initializeApp } from "firebase/app";
import { getAuth, deleteUser } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch, query } from "firebase/firestore";

// ------------------------------------------------------------------
// FIREBASE CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN_HERE",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID_HERE",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID_HERE"
};

// Helper to check if config is valid
export const isFirebaseConfigValid = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" &&
         !firebaseConfig.apiKey.includes("YOUR_API_KEY");
};

// Initialize Firebase conditionally
let app;
let auth: any = null;
let db: any = null;

if (isFirebaseConfigValid()) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firebase:", e);
  }
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

// Export services (may be null in Demo Mode)
export { auth, db };
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { initializeFirestore, enableNetwork, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { handleFirestoreError, OperationType } from "../utils/errorHandling";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCIVOidyoXfGAbmGx0CBCDqjk6KdMPDO6Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "project-0072b519-b9bc-4a17-885.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "project-0072b519-b9bc-4a17-885",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "project-0072b519-b9bc-4a17-885.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "489845233202",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:489845233202:web:3113c28693613ca2774e2b",
  databaseURL: "https://project-0072b519-b9bc-4a17-885-default-rtdb.firebaseio.com"
};

// Firestore database ID for multi-database support
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long polling and memory cache to prevent Unexpected state errors on reload
export const db = firestoreDatabaseId && firestoreDatabaseId !== firebaseConfig.projectId
  ? initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    }, firestoreDatabaseId)
  : initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
    });

// Explicitly ensure the network is enabled
enableNetwork(db).catch(err => console.error("Failed to enable network:", err));

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

export { handleFirestoreError, OperationType };


import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { initializeFirestore, enableNetwork, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { handleFirestoreError, OperationType } from "../utils/errorHandling";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCTXmLU6ytsh_bg8OEH7SMzIvEPxx6ytAA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "epimtheusproject.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "epimtheusproject",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "epimtheusproject.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "304076302876",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:304076302876:web:2d0b30bd4affa403e40dd9"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with long polling and memory cache to prevent Unexpected state errors on reload
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
});

// Explicitly ensure the network is enabled
enableNetwork(db).catch(err => console.error("Failed to enable network:", err));

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

export { handleFirestoreError, OperationType };


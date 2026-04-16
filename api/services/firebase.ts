import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

let firebaseApp: any = null;
let db: any = null;
let firebaseConfig: any = null;

export function getFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;

  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCTXmLU6ytsh_bg8OEH7SMzIvEPxx6ytAA",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "epimtheusproject.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "epimtheusproject",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "epimtheusproject.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "304076302876",
    appId: process.env.FIREBASE_APP_ID || "1:304076302876:web:2d0b30bd4affa403e40dd9"
  };

  return firebaseConfig;
}

export function getDb() {
  if (db) return db;
  const config = getFirebaseConfig();
  if (!config.apiKey && !process.env.FIREBASE_API_KEY) {
    throw new Error("Firebase configuration is missing. Please set up Firebase or provide environment variables.");
  }
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  db = getFirestore(firebaseApp);
  return db;
}

export async function getApiKey(): Promise<string | undefined> {
  // Get API key from env or fallback to Firestore
  if (process.env.OPENROUTER_API_KEY) {
    return process.env.OPENROUTER_API_KEY;
  }

  try {
    const firestore = getDb();
    const docRef = doc(firestore, "private_config", "api_keys");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data()?.openrouterApiKey) {
      return docSnap.data()?.openrouterApiKey;
    }
  } catch (e: unknown) {
    console.warn("Could not fetch API key from Firestore:", e);
  }

  return undefined;
}
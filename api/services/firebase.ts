import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

let firebaseApp: any = null;
let db: any = null;
let firebaseConfig: any = null;

export function getFirebaseConfig() {
  if (firebaseConfig) return firebaseConfig;

  firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCIVOidyoXfGAbmGx0CBCDqjk6KdMPDO6Q",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "project-0072b519-b9bc-4a17-885.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "project-0072b519-b9bc-4a17-885",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "project-0072b519-b9bc-4a17-885.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "489845233202",
    appId: process.env.FIREBASE_APP_ID || "1:489845233202:web:3113c28693613ca2774e2b",
    firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-8dfb031a-842c-43f3-a9a0-de3d25111682"
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
  db = getFirestore(firebaseApp, config.firestoreDatabaseId || "(default)");
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
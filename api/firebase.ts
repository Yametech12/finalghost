import 'dotenv/config';

let firebaseConfig: any = null;
let apiKey: string | null = null;

export function getFirebaseConfig() {
  if (!firebaseConfig) {
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };
  }
  return firebaseConfig;
}

export async function getApiKey(): Promise<string> {
  if (!apiKey) {
    apiKey = process.env.OPENROUTER_API_KEY || '';
  }
  return apiKey;
}
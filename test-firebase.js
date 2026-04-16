import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from './firebase-config.js';

// Test Firebase authentication
const testAuth = async () => {

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    console.log('Firebase initialized successfully');
    console.log('Auth object:', !!auth);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

testAuth();
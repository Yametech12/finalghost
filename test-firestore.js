import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config.js';

const testFirestore = async () => {

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log('Firebase initialized successfully');

    // Test Firestore access
    try {
      const testDoc = await getDoc(doc(db, '_health_check_', 'ping'));
      console.log('Firestore access successful');
      console.log('Document exists:', testDoc.exists());
    } catch (firestoreError) {
      console.error('Firestore access error:', firestoreError.code, firestoreError.message);
    }

  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

testFirestore();
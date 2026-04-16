import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const testFirestore = async () => {
  const firebaseConfig = {
    apiKey: "AIzaSyCIVOidyoXfGAbmGx0CBCDqjk6KdMPDO6Q",
    authDomain: "project-0072b519-b9bc-4a17-885.firebaseapp.com",
    projectId: "project-0072b519-b9bc-4a17-885",
    storageBucket: "project-0072b519-b9bc-4a17-885.firebasestorage.app",
    messagingSenderId: "489845233202",
    appId: "1:489845233202:web:3113c28693613ca2774e2b",
  };

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
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Message, UserData } from '../types';

export function useRealtimeUserData() {
  const { user, setUserData } = useAuth();
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (!mountedRef.current) return;

      if (snapshot.exists()) {
        const data = snapshot.data() as UserData;
        setUserData(data);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [user, setUserData]);
}
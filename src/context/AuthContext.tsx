import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendEmailVerification
} from 'firebase/auth';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';
import { toast } from 'sonner';

// Force prompt to select account every time for better UX
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  contactInfo?: {
    phone?: string;
    instagram?: string;
    twitter?: string;
  };
  role: 'user' | 'admin';
  createdAt: any;
  lastLoginAt?: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
  signInWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, rememberMe?: boolean) => Promise<{ requiresVerification: boolean }>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { displayName?: string, photoURL?: string }) => Promise<void>;
  updateUserData: (data: Partial<UserData>) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(() => {
    try {
      const cached = localStorage.getItem('epimetheus_user_data');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
// Cached user data parse failed
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync userData to localStorage
  useEffect(() => {
    try {
      if (userData) {
        localStorage.setItem('epimetheus_user_data', JSON.stringify(userData));
      } else {
        localStorage.removeItem('epimetheus_user_data');
      }
    } catch (e) {
// Failed to sync userData to localStorage
    }
  }, [userData]);

  const sendVerificationCode = async (email: string) => {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to send verification code';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.diagnostic || data.error || errorMessage;
          if (data.details) errorMessage += ` (${data.details})`;
        } else {
          const text = await response.text();
          errorMessage = text.slice(0, 100) || errorMessage;
        }
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
      throw new Error(errorMessage);
    }
  };

  const verifyCode = async (email: string, code: string) => {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    
    if (!response.ok) {
      let errorMessage = 'Invalid verification code';
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.diagnostic || data.error || errorMessage;
          if (data.details) errorMessage += ` (${data.details})`;
        } else {
          const text = await response.text();
          errorMessage = text.slice(0, 100) || errorMessage;
        }
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
      throw new Error(errorMessage);
    }
    
    return true;
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
    // Auth check timed out
        setLoading(false);
      }
    }, 8000); // 8s fallback to prevent permanent black screen

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // Check if email is verified for security
          if (!currentUser.emailVerified) {
            console.warn('User email not verified:', currentUser.email);
            // Show a subtle notification for email verification
            setTimeout(() => {
              toast.info('Please verify your email address for account security', {
                description: 'Check your inbox for a verification link from Firebase',
                duration: 8000,
                action: {
                  label: 'Resend',
                  onClick: () => sendEmailVerification(currentUser).then(() => toast.success('Verification email sent')),
                },
              });
            }, 2000); // Delay to avoid overwhelming user on login
          }

          // User exists: Proceed to fetch Firestore data safely
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            
            // Auto-promote default admin if they don't have the role yet
            const defaultAdmins = ['oraclemaster41@gmail.com', 'mohammadibrahim.202301433@gmail.com'];
            if (currentUser.email && defaultAdmins.includes(currentUser.email) && data.role !== 'admin') {
              try {
                await setDoc(doc(db, 'users', currentUser.uid), { role: 'admin' }, { merge: true });
                data.role = 'admin';
                console.log("Auto-promoted default admin to admin role.");
              } catch (err) {
                // Failed to auto-promote admin
              }
            }
            
            setUserData(data);
            
            // Update last login time (silently handle quota/network issues)
            try {
              await setDoc(doc(db, 'users', currentUser.uid), { lastLoginAt: new Date() }, { merge: true });
            } catch (err: any) {
              const isQuotaError = err?.code === 'resource-exhausted' || (err instanceof Error && err.message.includes('quota'));
              if (!isQuotaError && !(err instanceof Error && err.message.includes('network'))) {
                console.warn('Failed to update last login time:', err.message);
              }
              // Silently ignore quota/network errors for this non-critical operation
            }

            if (data.photoURL) {
              // Merge Firestore photoURL into the user object
              Object.defineProperty(currentUser, 'photoURL', {
                value: data.photoURL,
                writable: true,
                configurable: true
              });
            }
          } else {
            // Create the user document if it doesn't exist
            const defaultAdmins = ['oraclemaster41@gmail.com', 'mohammadibrahim.202301433@gmail.com'];
            const newUserData: UserData = {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: (currentUser.email && defaultAdmins.includes(currentUser.email)) ? 'admin' : 'user',
              createdAt: new Date(),
              lastLoginAt: new Date()
            };
            try {
              await setDoc(doc(db, 'users', currentUser.uid), newUserData);
              setUserData(newUserData);
            } catch (err: any) {
              const isQuotaError = err?.code === 'resource-exhausted' || (err instanceof Error && (err.message.includes('quota') || err.message.includes('resource-exhausted')));
              const isNetworkError = err instanceof Error && (err.message.includes('offline') || err.message.includes('network'));

              if (isQuotaError) {
                // Silently handle quota exceeded - use local storage
                console.info('Firebase quota exceeded, using local data storage');
                setUserData(newUserData);
              } else if (isNetworkError) {
                // Network issues - use local storage with notification
                console.warn('Network connectivity issues, using local data');
                setUserData(newUserData);
              } else {
                // Other errors - show error but still try local storage
                console.error('Firestore error during user creation:', err);
                setUserData(newUserData); // Still allow login with local data
              }
            }
          }
          setUser(currentUser);
        } else {
          // No user found. Immediately stop and clear states.
          setUser(null);
          setUserData(null);
          localStorage.removeItem('epimetheus_user_data');
        }
      } catch (error) {
        // Auth handled promise rejection
        setUser(null);
        setUserData(null);
      } finally {
        // Auth check finished
        setLoading(false);
        clearTimeout(timeoutId);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const updateUserProfile = async (data: { displayName?: string, photoURL?: string }) => {
    if (user) {
      // Only call Firebase updateProfile if it's not a massive base64 string
      // Firebase Auth has a strict limit on photoURL length
      if (!data.photoURL || !data.photoURL.startsWith('data:image/')) {
        try {
          await updateProfile(user, data);
        } catch (error) {
          // Error updating profile
          throw error;
        }
      }
      
      // Update userData state to trigger re-renders for components using it
      if (userData) {
        setUserData({ ...userData, ...data });
      }

      // Mutate the user object directly to preserve prototype methods
      if (data.photoURL !== undefined) {
        Object.defineProperty(user, 'photoURL', {
          value: data.photoURL,
          writable: true,
          configurable: true
        });
      }
      if (data.displayName !== undefined) {
        Object.defineProperty(user, 'displayName', {
          value: data.displayName,
          writable: true,
          configurable: true
        });
      }
      
      // We don't need to call setUser because updating userData will trigger a re-render
      // of the AuthProvider, which will pass down the mutated user object.
      // But just in case, we can trigger a re-render with a dummy state if needed.
      // Since we update userData above, it's sufficient.
    }
  };

  const signInWithGoogle = async (rememberMe: boolean = true) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      // Error signing in with Google
      throw error;
    }
  };

  const signInWithEmail = async (email: string, pass: string, rememberMe: boolean = true) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      // Error signing in with email
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, rememberMe: boolean = true) => {
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        // Send email verification with default Firebase handling
        await sendEmailVerification(userCredential.user);
        // Force a state update with the new display name
        setUser({ ...userCredential.user, displayName: name } as User);
        return { requiresVerification: true };
      }
      return { requiresVerification: false };
    } catch (error) {
      // Error signing up with email
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // Error sending password reset email
      throw error;
    }
  };

  const updateUserData = async (data: Partial<UserData>) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, data, { merge: true });
        setUserData(prev => prev ? { ...prev, ...data } : null);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      // Error signing out
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      resetPassword, 
      logout, 
      updateUserProfile, 
      updateUserData,
      sendVerificationCode,
      verifyCode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

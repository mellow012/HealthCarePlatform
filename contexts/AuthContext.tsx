
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

interface UserData {
  uid: string;
  email: string;
  role: 'super_admin' | 'hospital_admin' | 'patient';
  hospitalId?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  setupComplete?: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setUser(user);
      
      if (user) {
        try {
          // Create session cookie
          const idToken = await user.getIdToken();
          await fetch('/api/session/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          

          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            console.log('User data loaded:', data.role, data.setupComplete);
            setUserData(data);
          } else {
            // User document doesn't exist - create a default one
            console.warn('User document not found, creating default document...');
            
            // Determine if this is a patient (self-registered) or admin (invited)
            // Default to patient for self-registered users
            const defaultUserData = {
              uid: user.uid,
              email: user.email!,
              role: 'patient', // Default role
              createdAt: new Date(),
              setupComplete: true, // Patients don't need setup
              profile: {
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ')[1] || '',
              }
            };

            // Create user document
            await setDoc(doc(db, 'users', user.uid), defaultUserData);
            
            // Create patient document
            await setDoc(doc(db, 'patients', user.uid), {
              userId: user.uid,
              personalInfo: {},
              emergencyContact: {},
              medicalHistory: {},
              createdAt: new Date(),
            });

            console.log('Default user document created');
            setUserData(defaultUserData as UserData);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
        }
      } else {
        // Clear session cookie
        await fetch('/api/session/login', { method: 'DELETE' });
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', result.user.email);
      
      // Fetch user data
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const data = userDoc.data() as UserData;
      console.log('User role:', data.role, 'Setup complete:', data.setupComplete);
      
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      
      // Redirect based on role and setup status
      if (data.role === 'hospital_admin' && !data.setupComplete) {
        console.log('Redirecting to hospital setup');
        router.push('/hospital/setup');
      } else if (data.role === 'super_admin') {
        console.log('Redirecting to admin dashboard');
        router.push('/admin/dashboard');
      } else if (data.role === 'hospital_admin') {
        console.log('Redirecting to hospital dashboard');
        router.push('/hospital/dashboard');
      } else if (data.role === 'patient') {
        console.log('Redirecting to patient dashboard');
        router.push('/patient/dashboard');
      } else {
        console.log('Unknown role, redirecting to home');
        router.push('/');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, role: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Sign up successful:', result.user.email);
      
      // Create user document
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email,
        role,
        createdAt: new Date(),
        setupComplete: role === 'patient', // Patients don't need setup
      });

      // Create patient document if role is patient
      if (role === 'patient') {
        await setDoc(doc(db, 'patients', result.user.uid), {
          userId: result.user.uid,
          personalInfo: {},
          emergencyContact: {},
          medicalHistory: {},
          createdAt: new Date(),
        });
      }

      // Wait for state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Redirect to patient dashboard
      console.log('Redirecting to patient dashboard');
      router.push('/patient/dashboard');
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await fetch('/api/session/login', { method: 'DELETE' });
      console.log('Sign out successful');
      router.push('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

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

// EXTENDED ROLES
type AppRole = 'super_admin' | 'hospital_admin' | 'hospital_staff' | 'patient' | 'receptionist' | 'doctor';

interface UserData {
  uid: string;
  email: string;
  role: AppRole; 
  hospitalId?: string;
  staffRole?: string; 
  department?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  setupComplete?: boolean;
  requirePasswordReset?: boolean;
}
export interface AuthUser {
  uid: string;
  email: string | null;
  role: string;
  hospitalId?: string;        // ← ADD THIS
  department?: string;        // optional, if you have it
  profile?: {
    firstName?: string;
    lastName?: string;
  };
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

export function getRoleBasedRedirect(role: string, setupComplete: boolean = true): string {
  const r = (role || '').toLowerCase().trim(); // ← THIS FIXES CAPITAL "Doctor"

  if (!setupComplete) {
    if (r === 'hospital_admin') return '/hospital/setup';
    if (r === 'doctor' || r === 'receptionist' || r === 'hospital_staff') {
      return '/hospital/staff/setup';
    }
  }

  switch (r) {
    case 'super_admin':
      return '/admin/dashboard';
    case 'hospital_admin':
      return '/hospital/dashboard';
    case 'doctor':
      return '/hospital/doctor';           // ← NO trailing slash
    case 'receptionist':
      return '/hospital/receptionist';     // ← NO trailing slash
    case 'patient':
      return '/patient/dashboard';
    default:
      return '/auth/login';
  }
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // 1. Create session cookie on the backend
          const idToken = await firebaseUser.getIdToken();
          await fetch('/api/session/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });

          // 2. Fetch user document
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            setUserData(data);

            // NOTE: The primary redirection is now handled in the signIn function
            // when the user explicitly logs in. We remove redundant redirects here
            // to prevent race conditions and redirect loops.

          } else {
            // Fallback: create default patient profile if user exists but user doc does not
            const defaultData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              role: 'patient',
              setupComplete: true,
              profile: { firstName: '', lastName: '' }
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), defaultData);
            await setDoc(doc(db, 'patients', firebaseUser.uid), {
              userId: firebaseUser.uid,
              personalInfo: {},
              emergencyContact: {},
              medicalHistory: {},
              createdAt: new Date(),
            });
            setUserData(defaultData);
            // We still don't redirect here. The router protection on the client should handle this.
          }
        } catch (err) {
          console.error('Auth effect error (Failed to create session on change):', err);
          // If the session creation fails here, we should probably sign out the user locally
          // to prevent them from being stuck.
          await firebaseSignOut(auth);
          await fetch('/api/session/login', { method: 'DELETE' });
        }
      } else {
        // Clear session cookie on sign out
        await fetch('/api/session/login', { method: 'DELETE' });
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get ID token
      const idToken = await user.getIdToken();

      // Call backend to create session
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        // *** FIX: Read the actual error message from the backend response ***
        const errorBody = await response.json().catch(() => ({ 
            error: `Server Error ${response.status}` 
        }));
        
        // Throw the most specific error message we can find
        const backendError = errorBody.error || errorBody.message || `Failed to create session (HTTP ${response.status})`;
        throw new Error(backendError);
      }

      const data = await response.json();
      
      // Get the correct redirect path based on role
      const redirectPath = getRoleBasedRedirect(
        data.role, 
        data.setupComplete ?? true
      );
      
      // Hard redirect to role-specific dashboard
      window.location.href = redirectPath;
      
    } catch (err: any) {
      // Re-throw error so login screen can display it
      throw err;
    }
  };

  const signUp = async (email: string, password: string, role: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email,
      role,
      setupComplete: role === 'patient',
      createdAt: new Date(),
    });
    if (role === 'patient') {
      await setDoc(doc(db, 'patients', result.user.uid), {
        userId: result.user.uid,
        personalInfo: {},
        emergencyContact: {},
        medicalHistory: {},
        createdAt: new Date(),
      });
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await fetch('/api/session/login', { method: 'DELETE' });
    router.push('/auth/login');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value: AuthContextType = {
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
      {!loading && children}
    </AuthContext.Provider>
  );
}
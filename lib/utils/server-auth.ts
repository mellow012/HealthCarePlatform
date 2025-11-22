// lib/utils/server-auth.ts
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

// Basic session verification (what you have now)
export async function verifyAuth(sessionCookie?: string): Promise<DecodedIdToken | null> {
  if (!sessionCookie) return null;

  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

// Extended verification that fetches user data from Firestore
export interface AuthenticatedUser {
  uid: string;
  email: string | undefined;
  role: string;
  hospitalId?: string;
  department?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export async function verifyAuthWithUserData(sessionCookie?: string): Promise<AuthenticatedUser | null> {
  if (!sessionCookie) return null;

  try {
    // 1. Verify the session cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // 2. Fetch user data from Firestore
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    
    if (!userDoc.exists) {
      console.error(`User document not found for UID: ${decoded.uid}`);
      return null;
    }

    const userData = userDoc.data()!;

    return {
      uid: decoded.uid,
      email: decoded.email,
      role: userData.role || 'patient',
      hospitalId: userData.hospitalId,
      department: userData.department,
      profile: userData.profile,
    };
  } catch (error) {
    console.error('verifyAuthWithUserData failed:', error);
    return null;
  }
}

// Role-specific helpers
export async function verifyDoctor(sessionCookie?: string) {
  const user = await verifyAuthWithUserData(sessionCookie);
  
  if (!user || user.role !== 'doctor' || !user.hospitalId) {
    return null;
  }

  return user;
}

export async function verifyHospitalStaff(sessionCookie?: string) {
  const user = await verifyAuthWithUserData(sessionCookie);
  
  const HOSPITAL_ROLES = ['hospital_admin', 'hospital_staff', 'receptionist', 'doctor'];
  
  if (!user || !HOSPITAL_ROLES.includes(user.role) || !user.hospitalId) {
    return null;
  }

  return user;
}
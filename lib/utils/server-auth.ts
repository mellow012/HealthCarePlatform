import { adminAuth } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Verifies a Firebase session cookie string using the Firebase Admin SDK.
 * * NOTE: This assumes you have initialized your Firebase Admin SDK instance
 * and exported 'adminAuth' from '@/lib/firebase/admin'.
 * * @param sessionCookie The session cookie string from the request headers/cookies.
 * @returns The decoded ID token payload or null if verification fails.
 */
export async function verifyAuth(sessionCookie?: string): Promise<DecodedIdToken | null> {
  if (!sessionCookie) {
    return null;
  }

  try {
    // Verify the session cookie. Passing 'true' checks for session revocation.
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true 
    );
    return decodedClaims;
  } catch (error) {
    // Log the failure reason (e.g., cookie expired, revoked, invalid) for debugging
    console.error('Firebase session cookie verification failed:', error);
    return null;
  }
}
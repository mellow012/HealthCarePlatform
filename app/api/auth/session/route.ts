import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/session
 * Creates a server-side session cookie after a successful Firebase client login.
 * This cookie is then used to authenticate all subsequent API calls.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Set cookie expiration time to 5 days (in milliseconds)
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // 1. Create the session cookie from the ID token
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // 2. Set the secure cookie in the response headers
    const cookieStore = cookies();
   (await cookieStore).set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true, // Prevents client-side JS access
      secure: process.env.NODE_ENV === 'production', // Use secure in production
      path: '/',
      sameSite: 'lax',
    });

    // 3. Verify the token to get the UID for Firestore lookup
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 4. Fetch user data from Firestore to return role and setup status for client redirect
    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // Should not happen if user successfully logged in, but provide a patient default
      return NextResponse.json({
        success: true,
        role: 'patient',
        setupComplete: false,
      }, { status: 200 });
    }

    const userData = userDoc.data();

    // Return the role and setup status needed by the client for redirection
    return NextResponse.json({
      success: true,
      role: userData?.role || 'patient', // Default to patient if role is missing
      setupComplete: userData?.setupComplete || false,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Session creation error:', error);
    // If token verification fails (e.g., token is expired or invalid), Firebase Admin SDK throws an error.
    return NextResponse.json({ error: 'Authentication failed (Invalid token)' }, { status: 401 });
  }
}

/**
 * DELETE /api/auth/session
 * Clears the session cookie and revokes the session on the Firebase backend.
 */
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const sessionCookie = (await cookieStore).get('session')?.value || '';

    // Clear the cookie client-side by setting maxAge to 0
    (await cookieStore).set('session', '', { maxAge: 0, httpOnly: true, path: '/' });

    // Revoke the session on the server-side (optional but good practice)
    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie);
        await adminAuth.revokeRefreshTokens(decoded.sub);
      } catch (e) {
        // If the session is already invalid, we still clear the client-side cookie
        console.warn('Could not verify or revoke session token, but clearing cookie.');
      }
    }

    return NextResponse.json({ success: true, message: 'Session logged out' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ success: true, message: 'Logout successful, but an issue occurred during server cleanup.' });
  }
}
// app/api/session/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 5; // 5 days in seconds

/**
 * POST /api/session/login
 * Exchanges Firebase ID Token → Secure Session Cookie
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json(
        { error: 'ID Token is required' },
        { status: 400 }
      );
    }

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: COOKIE_MAX_AGE * 1000, // ms
    });

    // Set HttpOnly, Secure cookie
    const response = NextResponse.json(
      { success: true, message: 'Session created' },
      { status: 200 }
    );

    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('Session login error:', error);

    const message =
      error.code === 'auth/argument-error'
        ? 'Invalid ID token'
        : error.code === 'auth/id-token-expired'
        ? 'ID token expired'
        : 'Failed to create session';

    return NextResponse.json({ error: message }, { status: 401 });
  }
}

/**
 * DELETE /api/session/login
 * Logs out user by clearing session cookie
 */
export async function DELETE() {
  const response = NextResponse.json(
    { success: true, message: 'Logged out' },
    { status: 200 }
  );

  response.cookies.delete({
    name: 'session',
    path: '/',
  });

  return response;
}

/**
 * GET /api/session/login (DEV ONLY)
 * Verifies current session cookie and returns user claims
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    return NextResponse.json({
      success: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      hospitalId: decoded.hospitalId,
      exp: new Date(decoded.exp * 1000).toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Invalid session', details: error.message },
      { status: 401 }
    );
  }
}
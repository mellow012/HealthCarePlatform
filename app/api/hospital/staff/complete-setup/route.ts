// app/api/hospital/staff/complete-setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the session cookie (this works for ALL users: admin, doctor, receptionist, etc.)
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    const body = await req.json();
    const { firstName, lastName, phone } = body;

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json({ error: 'First and last name are required' }, { status: 400 });
    }

    // Update the user's own document — ANY staff member can do this
    await adminDb.collection('users').doc(decoded.uid).update({
      'profile.firstName': firstName.trim(),
      'profile.lastName': lastName.trim(),
      'profile.phone': phone?.trim() || null,
      setupComplete: true,
      requirePasswordReset: false,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Welcome aboard!' });
  } catch (err: any) {
      console.error('complete-setup error:', err);
      return NextResponse.json(
        { error: err.message || 'Setup failed' },
        { status: 500 }
      );
  }
}
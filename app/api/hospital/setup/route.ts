// app/api/hospital/setup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1. Get session cookie
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized – no session' }, { status: 401 });
    }

    // 2. Verify **session cookie** (not ID token)
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);

    // 3. Confirm role
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.role !== 'hospital_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const hospitalData = await req.json();

    // 4. Validate at least one department
    if (!Array.isArray(hospitalData.departments) || hospitalData.departments.length === 0) {
      return NextResponse.json({ error: 'Select at least one department' }, { status: 400 });
    }

    // 5. Use the **hospitalId from custom claims** (set when admin was created)
    const hospitalId = decoded.hospitalId;
    if (!hospitalId) {
      return NextResponse.json({ error: 'Hospital ID missing' }, { status: 400 });
    }

    // 6. Update hospital document
    const hospitalRef = adminDb.collection('hospitals').doc(hospitalId);
    await hospitalRef.update({
      ...hospitalData,
      setupCompleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 7. Mark user as fully set up
    await adminDb.collection('users').doc(decoded.uid).update({
      setupComplete: true,
      requirePasswordReset: false,
    });

    // 8. Audit log
    await adminDb.collection('auditLogs').add({
      userId: decoded.uid,
      action: 'HOSPITAL_SETUP_COMPLETE',
      resourceType: 'hospital',
      resourceId: hospitalId,
      metadata: hospitalData,
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Hospital setup completed',
      hospitalId,
    });
  } catch (error: any) {
    console.error('Hospital setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Setup failed' },
      { status: 500 }
    );
  }
}
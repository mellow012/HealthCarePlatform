// app/api/visits/self-checkout/route.ts  ← rename this file!
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No session' }, { status: 401 });
    }

    // CRITICAL FIX: Use verifySessionCookie, NOT verifyIdToken
    const decoded = await adminAuth.verifySessionCookie(token, true);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { visitId } = await req.json();
    if (!visitId) {
      return NextResponse.json({ error: 'Visit ID required' }, { status: 400 });
    }

    const visitRef = adminDb.collection('visits').doc(visitId);
    const visitDoc = await visitRef.get();

    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = visitDoc.data()!;

    // Security: Only the patient can self-checkout their own active visit
    if (visitData.patientId !== decoded.uid) {
      return NextResponse.json({ error: 'Not your visit' }, { status: 403 });
    }

    if (visitData.status !== 'checked_in') {
      return NextResponse.json({ error: 'Visit already ended' }, { status: 400 });
    }

    const checkOutTime = FieldValue.serverTimestamp();

    // Update visit
    await visitRef.update({
      status: 'checked_out',
      checkOutTime,
      'metadata.checkedOutBy': 'patient_self',
      'metadata.checkOutMethod': 'self_service',
      updatedAt: checkOutTime,
    });

    // Revoke active access grants
    const grantsSnap = await adminDb
      .collection('accessGrants')
      .where('visitId', '==', visitId)
      .where('status', '==', 'active')
      .get();

    const batch = adminDb.batch();
    grantsSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'revoked',
        revokedAt: checkOutTime,
      });
    });
    await batch.commit();

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decoded.uid,
      action: 'PATIENT_SELF_CHECKOUT',
      resourceType: 'visit',
      resourceId: visitId,
      metadata: {
        patientId: decoded.uid,
        hospitalId: visitData.hospitalId,
      },
      timestamp: checkOutTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you! You have been checked out.',
    });

  } catch (error: any) {
    console.error('Self checkout error:', error);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
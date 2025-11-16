// app/api/visits/[id]/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth.verifySessionCookie(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userDoc.data();

    if (userData?.role !== 'hospital_admin' || !userData.hospitalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const visitId = params.id;
    const visitDoc = await adminDb.collection('visits').doc(visitId).get();
    if (!visitDoc.exists) return NextResponse.json({ error: 'Visit not found' }, { status: 404 });

    const visitData = visitDoc.data();
    if (visitData.hospitalId !== userData.hospitalId || visitData.status !== 'checked_in') {
      return NextResponse.json({ error: 'Unauthorized to check out this visit' }, { status: 403 });
    }

    const checkOutTime = new Date();

    // Update visit
    await adminDb.collection('visits').doc(visitId).update({
      status: 'checked_out',
      checkOutTime,
      updatedAt: new Date(),
    });

    // Revoke access grant
    const grantsSnapshot = await adminDb
      .collection('accessGrants')
      .where('visitId', '==', visitId)
      .where('status', '==', 'active')
      .get();

    grantsSnapshot.forEach((doc) => {
      doc.ref.update({
        status: 'revoked',
        revokedAt: checkOutTime,
      });
    });

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decoded.uid,
      action: 'PATIENT_CHECK_OUT',
      resourceType: 'visit',
      resourceId: visitId,
      metadata: { patientId: visitData.patientId, hospitalId: userData.hospitalId },
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, message: 'Patient checked out' });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Failed to check out patient' }, { status: 500 });
  }
}
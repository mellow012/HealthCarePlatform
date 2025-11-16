import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const { visitId } = await req.json();

    const visitDoc = await adminDb.collection('visits').doc(visitId).get();
    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = visitDoc.data();
    if (visitData?.status === 'checked_out') {
      return NextResponse.json(
        { error: 'Patient already checked out' },
        { status: 400 }
      );
    }

    const checkOutTime = new Date();

    // Update visit
    await adminDb.collection('visits').doc(visitId).update({
      status: 'checked_out',
      checkOutTime,
      'metadata.checkOutBy': decodedToken.uid,
    });

    // Revoke access grants
    const grantsSnapshot = await adminDb
      .collection('accessGrants')
      .where('visitId', '==', visitId)
      .where('status', '==', 'active')
      .get();

    const batch = adminDb.batch();
    grantsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'revoked',
        revokedAt: checkOutTime,
      });
    });
    await batch.commit();

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decodedToken.uid,
      action: 'PATIENT_CHECK_OUT',
      resourceType: 'visit',
      resourceId: visitId,
      metadata: { 
        patientId: visitData?.patientId, 
        hospitalId: visitData?.hospitalId,
        duration: checkOutTime.getTime() - visitData?.checkInTime.toDate().getTime()
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Patient checked out successfully',
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check out patient' },
      { status: 500 }
    );
  }
}
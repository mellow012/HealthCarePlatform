// app/api/visits/[id]/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // FIXED: Await params to unwrap the Promise
    const { id } = await params;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.log('Invalid visit ID:', id);
      return NextResponse.json({ error: 'Invalid visit ID' }, { status: 400 });
    }

    const visitId = id.trim();
    console.log('Checkout attempt for visitId:', visitId);

    // Auth - Session cookie
    const token =(await cookies()).get('session')?.value;
    if (!token) {
      console.log('No session token for checkout');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(token, true);
    if (!decoded) {
      console.log('Session verification failed for checkout');
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
    }

    // Verify user role
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'hospital_admin' || !userData.hospitalId) {
      console.log('Invalid role or hospitalId for checkout:', { role: userData?.role, hospitalId: userData?.hospitalId });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get visit doc
    const visitDoc = await adminDb.collection('visits').doc(visitId).get();
    if (!visitDoc.exists) {
      console.log('Visit not found:', visitId);
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = visitDoc.data();
    if (visitData.hospitalId !== userData.hospitalId || visitData.status !== 'checked_in') {
      console.log('Unauthorized visit:', { hospitalId: visitData.hospitalId, status: visitData.status });
      return NextResponse.json({ error: 'Unauthorized to check out this visit' }, { status: 403 });
    }

    const checkOutTime = FieldValue.serverTimestamp();

    // Update visit status
    await adminDb.collection('visits').doc(visitId).update({
      status: 'checked_out',
      checkOutTime,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Revoke access grants for this visit
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
      metadata: { 
        patientId: visitData.patientId, 
        hospitalId: userData.hospitalId 
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log('Checkout successful for visitId:', visitId);
    return NextResponse.json({ 
      success: true, 
      message: 'Patient checked out successfully',
      data: { visitId, checkOutTime: new Date().toISOString() } // Approx client time
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    // FIXED: Better error handling for document path issues
    if (error.message.includes('documentPath')) {
      return NextResponse.json({ error: 'Invalid visit ID format' }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error.message || 'Failed to check out patient' 
    }, { status: 500 });
  }
}
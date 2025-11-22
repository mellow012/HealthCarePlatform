// app/api/visits/[id]/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Invalid visit ID' }, { status: 400 });
    }
    const visitId = id.trim();

    // Auth
    const token = (await cookies()).get('session')?.value;
    if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const decoded = await adminAuth.verifySessionCookie(token, true);
    if (!decoded) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Get staff user
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    const userData = userDoc.data()!;

    // FIXED: Allow BOTH hospital_admin AND hospital_staff
   // Allow: hospital_admin, receptionist, doctor, hospital_staff
const allowedRoles = ['hospital_admin', 'receptionist', 'doctor', 'hospital_staff'];

if (!allowedRoles.includes(userData.role) || !userData.hospitalId) {
  console.log('Checkout denied:', { role: userData.role, hospitalId: userData.hospitalId });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

    const staffHospitalId = userData.hospitalId;

    // Get visit
    const visitRef = adminDb.collection('visits').doc(visitId);
    const visitDoc = await visitRef.get();

    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const visitData = visitDoc.data()!;

    // Security: Must be same hospital + currently checked in
    if (visitData.hospitalId !== staffHospitalId || visitData.status !== 'checked_in') {
      return NextResponse.json({ error: 'Cannot check out this visit' }, { status: 403 });
    }

    const checkOutTime = FieldValue.serverTimestamp();

    // Update visit
    await visitRef.update({
      status: 'checked_out',
      checkOutTime,
      updatedAt: checkOutTime,
    });

    // Revoke all active access grants for this visit
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
      action: 'PATIENT_CHECK_OUT',
      resourceType: 'visit',
      resourceId: visitId,
      metadata: { patientId: visitData.patientId },
      timestamp: checkOutTime,
    });

    return NextResponse.json({
      success: true,
      message: 'Patient checked out successfully',
    });

  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
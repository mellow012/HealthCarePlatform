// app/api/visits/check-in/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const decodedToken = await adminAuth.verifySessionCookie(token, true);
    if (!decodedToken) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });

    const userData = userDoc.data()!;

    // FIXED: Allow BOTH hospital_admin AND hospital_staff
    const allowedRoles = ['hospital_admin', 'hospital_staff','receptionist'];
    if (!allowedRoles.includes(userData.role) || !userData.hospitalId) {
      console.log('Check-in denied:', { role: userData.role, hospitalId: userData.hospitalId });
      return NextResponse.json({ error: 'Unauthorized or hospital not configured' }, { status: 403 });
    }

    const staffHospitalId = userData.hospitalId;
    const { patientEmail, purpose, department } = await req.json();

    if (!patientEmail || !purpose || !department) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Find patient
    const patientSnap = await adminDb
      .collection('users')
      .where('email', '==', patientEmail.toLowerCase())
      .where('role', '==', 'patient')
      .limit(1)
      .get();

    if (patientSnap.empty) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const patientId = patientSnap.docs[0].id;

    // Prevent double check-in
    const activeCheck = await adminDb
      .collection('visits')
      .where('patientId', '==', patientId)
      .where('hospitalId', '==', staffHospitalId)
      .where('status', '==', 'checked_in')
      .limit(1)
      .get();

    if (!activeCheck.empty) {
      return NextResponse.json({ error: 'Patient already checked in' }, { status: 400 });
    }

    // E-Health Passport check
    const passportDoc = await adminDb.collection('eHealthPassports').doc(patientId).get();
    const isFirstCheckIn = !passportDoc.exists || !passportDoc.data()?.isActive;

    if (isFirstCheckIn) {
      await initializeEHealthPassport(patientId, staffHospitalId);
    }

    // Create visit
    const visitId = `visit_${patientId}_${Date.now()}`;
    const checkInTime = FieldValue.serverTimestamp();

    await adminDb.collection('visits').doc(visitId).set({
      id: visitId,
      patientId,
      hospitalId: staffHospitalId,
      checkInTime,
      status: 'checked_in',
      purpose,
      department,
      isFirstVisit: isFirstCheckIn,
      createdAt: checkInTime,
    });

    // Grant access
    await adminDb.collection('accessGrants').add({
      patientId,
      hospitalId: staffHospitalId,
      visitId,
      grantedAt: checkInTime,
      status: 'active',
      permissions: ['read', 'write'],
    });

    // Update passport history
    await updateVisitHistory(patientId, staffHospitalId);

    return NextResponse.json({
      success: true,
      message: isFirstCheckIn
        ? 'Patient checked in + E-Health Passport activated!'
        : 'Patient checked in successfully',
      data: { visitId, eHealthPassportActivated: isFirstCheckIn },
    });

  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Keep your helper functions exactly as they are — they’re perfect
async function initializeEHealthPassport(patientId: string, hospitalId: string) { /* ... your code ... */ }
async function updateVisitHistory(patientId: string, hospitalId: string) { /* ... your code ... */ }
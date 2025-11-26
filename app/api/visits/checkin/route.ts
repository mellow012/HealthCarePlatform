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

    const allowedRoles = ['hospital_admin', 'hospital_staff', 'receptionist'];
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
    const patientData = patientSnap.docs[0].data();

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
      await initializeEHealthPassport(patientId, staffHospitalId, patientData);
    }

    // Create visit
    const visitId = `visit_${patientId}_${Date.now()}`;
    const checkInTime = new Date();

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

// Initialize E-Health Passport on first check-in
async function initializeEHealthPassport(
  patientId: string, 
  hospitalId: string,
  patientData: any
) {
  const now = new Date();
  
  const passportData = {
    patientId,
    isActive: true,
    activatedAt: now,
    activatedBy: hospitalId,
    
    // Personal Information (from user profile)
    personalInfo: {
      firstName: patientData?.profile?.firstName || '',
      lastName: patientData?.profile?.lastName || '',
      dateOfBirth: patientData?.profile?.dateOfBirth || null,
      bloodType: patientData?.profile?.bloodType || null,
      gender: patientData?.profile?.gender || null,
      phone: patientData?.profile?.phone || null,
      email: patientData?.email || '',
    },
    
    // Medical Records (initially empty)
    diagnoses: [],
    prescriptions: [],
    allergies: [],
    vaccinations: [],
    labResults: [],
    
    // Consent
    consent: {
      dataSharing: true, // Patient agreed during first check-in
      emergencyAccess: true,
      researchParticipation: false,
    },
    
    // Visit History
    visitHistory: [{
      hospitalId,
      firstVisit: now,
      lastVisit: now,
      totalVisits: 1,
    }],
    
    // Metadata
    createdAt: now,
    updatedAt: now,
    version: '1.0',
  };

  await adminDb.collection('eHealthPassports').doc(patientId).set(passportData);
}

// Update visit history in passport
async function updateVisitHistory(patientId: string, hospitalId: string) {
  const passportRef = adminDb.collection('eHealthPassports').doc(patientId);
  const passportDoc = await passportRef.get();
  
  if (!passportDoc.exists) return;
  
  const data = passportDoc.data()!;
  const visitHistory = data.visitHistory || [];
  
  // Find or create hospital entry
  const hospitalIndex = visitHistory.findIndex((h: any) => h.hospitalId === hospitalId);
  
  if (hospitalIndex >= 0) {
    // Update existing
    visitHistory[hospitalIndex].lastVisit = new Date();
    visitHistory[hospitalIndex].totalVisits += 1;
  } else {
    // Add new
    visitHistory.push({
      hospitalId,
      firstVisit: new Date(),
      lastVisit: new Date(),
      totalVisits: 1,
    });
  }
  
  await passportRef.update({
    visitHistory,
    updatedAt: new Date(),
  });
}
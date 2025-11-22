// app/api/doctor/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

interface DoctorData {
  uid: string;
  hospitalId: string;
  department: string;
}

async function verifyDoctor(session: string): Promise<DoctorData | null> {
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const snap = await adminDb.collection('users').doc(decoded.uid).get();
    const data = snap.data();

    if (!snap.exists) {
      console.error(`AUTH_FAIL: User document not found for UID: ${decoded.uid}`);
      return null;
    }

    if (data?.role !== 'doctor') {
      console.error(`AUTH_FAIL: User ${decoded.uid} has role: ${data?.role}, expected 'doctor'`);
      return null;
    }

    if (!data?.hospitalId) {
      console.error(`AUTH_FAIL: Doctor ${decoded.uid} missing hospitalId.`);
      return null;
    }

    if (!data?.department) {
      console.error(`AUTH_FAIL: Doctor ${decoded.uid} missing department.`);
      return null;
    }

    return {
      uid: decoded.uid,
      hospitalId: data.hospitalId as string,
      department: data.department as string,
    };
  } catch (err: any) {
    console.error('verifyDoctor error:', err.message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doctor = await verifyDoctor(sessionCookie);
    
    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ========== DEBUG LOGGING ==========
    console.log('========== DEBUG: DOCTOR QUERY ==========');
    console.log('Doctor UID:', doctor.uid);
    console.log('Doctor HospitalId:', `"${doctor.hospitalId}"`);
    console.log('Doctor Department:', `"${doctor.department}"`);
    console.log('=========================================');

    // First, let's see ALL checked_in visits for this hospital (ignore department filter)
    const allVisitsSnapshot = await adminDb
      .collection('visits')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('status', '==', 'checked_in')
      .get();

    console.log('========== DEBUG: ALL VISITS ==========');
    console.log('Total checked_in visits in hospital:', allVisitsSnapshot.size);
    allVisitsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`  - Visit ${doc.id}: department="${data.department}", status="${data.status}"`);
    });
    console.log('=======================================');

    // Now the actual filtered query
    const visitsSnapshot = await adminDb
      .collection('visits')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('department', '==', doctor.department)
      .where('status', '==', 'checked_in')
      .orderBy('checkInTime', 'desc')
      .get();

    console.log('========== DEBUG: FILTERED RESULTS ==========');
    console.log('Visits matching department:', visitsSnapshot.size);
    console.log('=============================================');
    // ========== END DEBUG ==========

    const visits = await Promise.all(
      visitsSnapshot.docs.map(async (doc) => {
        const visitData = doc.data();
        
        const patientDoc = await adminDb.collection('users').doc(visitData.patientId).get();
        const patientData = patientDoc.data();

        return {
          id: doc.id,
          ...visitData,
          checkInTime: visitData.checkInTime?.toDate?.()?.toISOString() || visitData.checkInTime,
          patient: {
            id: patientDoc.id,
            email: patientData?.email || '',
            profile: patientData?.profile || {},
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: visits });
  } catch (err: any) {
    console.error('GET /api/doctor/patients error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
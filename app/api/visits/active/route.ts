// app/api/visits/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      console.log('No session token found');
      return NextResponse.json({ error: 'Unauthorized - No session token' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(token);
    console.log('Session verified for UID:', decoded.uid);

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      console.log('User doc not found for UID:', decoded.uid);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    console.log('User data:', { role: userData?.role, hospitalId: userData?.hospitalId });

    if (userData?.role !== 'hospital_admin' || !userData.hospitalId) {
      console.log('Role or hospitalId invalid:', { role: userData?.role, hospitalId: userData?.hospitalId });
      return NextResponse.json({ error: 'Forbidden - Invalid role or hospital' }, { status: 403 });
    }

    const hospitalId = userData.hospitalId;
    console.log('Fetching visits for hospitalId:', hospitalId);

    const visitsSnapshot = await adminDb
      .collection('visits')
      .where('hospitalId', '==', hospitalId)
      .where('status', '==', 'checked_in')
      .orderBy('checkInTime', 'desc')
      .limit(50)
      .get();

    console.log('Visits snapshot size:', visitsSnapshot.size);

    const visits = await Promise.all(
      visitsSnapshot.docs.map(async (doc) => {
        const visitData = doc.data();
        console.log('Processing visit:', doc.id, visitData);

        const patientDoc = await adminDb.collection('users').doc(visitData.patientId).get();
        const patientData = patientDoc.data() || {};

        // Safe timestamp handling
        let checkInTime = null;
        if (visitData.checkInTime && visitData.checkInTime.toDate) {
          checkInTime = visitData.checkInTime.toDate().toISOString();
        } else if (typeof visitData.checkInTime === 'string') {
          checkInTime = visitData.checkInTime;
        }

        return {
          id: doc.id,
          ...visitData,
          checkInTime,
          patient: {
            name: `${patientData.profile?.firstName || ''} ${patientData.profile?.lastName || ''}`.trim() || 'Unknown Patient',
            email: patientData.email || '',
          },
        };
      })
    );

    console.log('Processed visits count:', visits.length);
    return NextResponse.json({ success: true, data: visits });
  } catch (error: any) {
    console.error('Error fetching active visits:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to fetch active visits' 
    }, { status: 500 });
  }
}
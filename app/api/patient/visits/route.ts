// app/api/patient/visits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // FIXED: Use verifySessionCookie for the session token from cookie
    const decodedToken = await adminAuth.verifySessionCookie(token, true); // true = check revoked

    // Optional: Double-check role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'patient') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get patient's visits
    const visitsSnapshot = await adminDb
      .collection('visits')
      .where('patientId', '==', decodedToken.uid)
      .orderBy('checkInTime', 'desc')
      .limit(50)
      .get();

    const visits = await Promise.all(
      visitsSnapshot.docs.map(async (doc) => {
        const visitData = doc.data();
        
        // Get hospital info
        const hospitalDoc = await adminDb.collection('hospitals').doc(visitData.hospitalId).get();
        const hospitalData = hospitalDoc.data();

        return {
          id: doc.id,
          ...visitData,
          checkInTime: visitData.checkInTime.toDate().toISOString(),
          checkOutTime: visitData.checkOutTime?.toDate().toISOString() || null,
          hospital: {
            name: hospitalData?.name || 'Unknown Hospital',
            address: hospitalData?.address || {},
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: visits });
  } catch (error: any) {
    console.error('Error fetching visits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch visits' },
      { status: 500 }
    );
  }
}
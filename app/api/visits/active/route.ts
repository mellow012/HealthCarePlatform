// app/api/visits/active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify session
    const decoded = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decoded.uid;

    // Get user data
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data()!;
    const role = userData.role as string;
    const hospitalId = userData.hospitalId as string;

    // Define roles that can access active visits
    const ALLOWED_ROLES = [
      'hospital_admin',
      'receptionist',
      'doctor',
      'nurse',
      'pharmacist',
      'lab_tech',
      'billing',
      'records_officer',
    ] as const;

    if (!hospitalId || !ALLOWED_ROLES.includes(role as any)) {
      console.log('Access denied:', { uid, role, hospitalId });
      return NextResponse.json(
        { error: 'Forbidden – insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch active (checked-in) visits
    const visitsSnap = await adminDb
      .collection('visits')
      .where('hospitalId', '==', hospitalId)
      .where('status', '==', 'checked_in')
      .orderBy('checkInTime', 'desc')
      .limit(50)
      .get();

    const visits = await Promise.all(
      visitsSnap.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch patient name
        let patientName = 'Unknown Patient';
        let patientEmail = '';

        if (data.patientId) {
          const patientSnap = await adminDb.collection('users').doc(data.patientId).get();
          if (patientSnap.exists) {
            const p = patientSnap.data()!;
            patientName = `${p.profile?.firstName || ''} ${p.profile?.lastName || ''}`.trim() || 'Unknown Patient';
            patientEmail = p.email || '';
          }
        }

        // Format check-in time
        let checkInTime = null;
        if (data.checkInTime) {
          if (typeof data.checkInTime.toDate === 'function') {
            checkInTime = data.checkInTime.toDate().toISOString();
          } else {
            checkInTime = new Date(data.checkInTime).toISOString();
          }
        }

        return {
          id: doc.id,
          patientId: data.patientId,
          patient: {
            name: patientName,
            email: patientEmail,
          },
          reason: data.reason || 'General Checkup',
          checkInTime,
          queueNumber: data.queueNumber || null,
        };
      })
    );

    return NextResponse.json({ success: true, data: visits });
  } catch (error: any) {
    console.error('GET /api/visits/active error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
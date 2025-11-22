// app/api/doctor/prescriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyDoctor } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const doctor = await verifyDoctor(sessionCookie);

    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get('patientId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: FirebaseFirestore.Query = adminDb
      .collection('prescriptions')
      .where('doctorId', '==', doctor.uid)
      .where('hospitalId', '==', doctor.hospitalId);

    if (patientId) {
      query = query.where('patientId', '==', patientId);
    }

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const prescriptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch patient info
        const patientDoc = await adminDb.collection('users').doc(data.patientId).get();
        const patient = patientDoc.data();

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          duration: {
            ...data.duration,
            startDate: data.duration?.startDate?.toDate?.()?.toISOString(),
            endDate: data.duration?.endDate?.toDate?.()?.toISOString(),
          },
          patient: {
            id: patientDoc.id,
            email: patient?.email || '',
            name: `${patient?.profile?.firstName || ''} ${patient?.profile?.lastName || ''}`.trim(),
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: prescriptions });
  } catch (err: any) {
    console.error('GET /api/doctor/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
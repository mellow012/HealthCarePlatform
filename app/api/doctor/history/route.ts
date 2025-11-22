// app/api/doctor/history/route.ts
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
    const limit = parseInt(searchParams.get('limit') || '100');
    const patientId = searchParams.get('patientId');

    let query: FirebaseFirestore.Query = adminDb
      .collection('diagnosis_records')
      .where('doctorId', '==', doctor.uid)
      .where('hospitalId', '==', doctor.hospitalId);

    if (patientId) {
      query = query.where('patientId', '==', patientId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(limit).get();

    const records = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Fetch patient
        const patientDoc = await adminDb.collection('users').doc(data.patientId).get();
        const patient = patientDoc.data();

        // Fetch prescriptions for this diagnosis
        const rxSnapshot = await adminDb
          .collection('prescriptions')
          .where('diagnosisId', '==', doc.id)
          .get();

        const prescriptions = rxSnapshot.docs.map((rxDoc) => {
          const rxData = rxDoc.data();
          return {
            id: rxDoc.id,
            medication: rxData.medication,
            dosage: rxData.dosage,
          };
        });

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          patient: {
            id: patientDoc.id,
            name: `${patient?.profile?.firstName || ''} ${patient?.profile?.lastName || ''}`.trim(),
            email: patient?.email || '',
          },
          prescriptions,
        };
      })
    );

    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    console.error('GET /api/doctor/history error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
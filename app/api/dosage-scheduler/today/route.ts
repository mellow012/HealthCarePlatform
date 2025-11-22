// GET today's doses
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const snapshot = await adminDb
      .collection('dosageSchedules')
      .where('patientId', '==', decoded.uid)
      .where('scheduledDateTime', '>=', today)
      .where('scheduledDateTime', '<', tomorrow)
      .orderBy('scheduledDateTime', 'asc')
      .get();

    const schedules = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const medDoc = await adminDb.collection('medications').doc(data.medicationId).get();
        const med = medDoc.data();

        return {
          id: doc.id,
          ...data,
          scheduledDateTime: data.scheduledDateTime?.toDate?.().toISOString(),
          takenAt: data.takenAt?.toDate?.().toISOString(),
          medication: {
            name: med?.name || 'Unknown',
            dosage: med?.dosage || '',
            instructions: med?.instructions || '',
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
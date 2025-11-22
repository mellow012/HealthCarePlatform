// POST mark dose as taken
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { scheduleId, notes = '' } = await req.json();

    const scheduleRef = adminDb.collection('dosageSchedules').doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data()!;

    await scheduleRef.update({
      status: 'taken',
      takenAt: new Date(),
      notes,
    });

    // Decrease remaining doses
    const medRef = adminDb.collection('medications').doc(scheduleData.medicationId);
    const medDoc = await medRef.get();
    if (medDoc.exists) {
      const remaining = Math.max(0, (medDoc.data()?.remainingDoses || 1) - 1);
      await medRef.update({ remainingDoses: remaining });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
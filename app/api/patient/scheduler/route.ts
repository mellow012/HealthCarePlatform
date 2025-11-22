import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  const session = await verifyAuth(sessionCookie);

  if (!session || !session.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
        .collection('users')
        .doc(session.uid)
        .collection('schedules')
        .orderBy('createdAt', 'desc')
        .get();

    const schedules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}
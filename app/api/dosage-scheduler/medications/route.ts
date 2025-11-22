// GET patient's medications
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    const decoded = await verifyAuth(sessionCookie); // ← pass string, not req

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';

    const snapshot = await adminDb
      .collection('medications')
      .where('patientId', '==', decoded.uid)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    const medications = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate?.()?.toISOString(),
        endDate: data.endDate?.toDate?.()?.toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: medications });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
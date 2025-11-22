// app/api/ai-diagnosis/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/server-auth';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    // CORRECT WAY — extract session cookie first
    const sessionCookie = req.cookies.get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionsSnapshot = await adminDb
      .collection('diagnosisSessions')
      .where('patientId', '==', decoded.uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const sessions = sessionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error: any) {
    console.error('Error fetching diagnosis history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
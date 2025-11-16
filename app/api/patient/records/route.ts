import { NextResponse } from "next/server";
import {NextRequest} from "next/server";
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Get patient's medical records
    const recordsSnapshot = await adminDb
      .collection('medicalRecords')
      .where('patientId', '==', decodedToken.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const records = await Promise.all(
      recordsSnapshot.docs.map(async (doc) => {
        const recordData = doc.data();
        
        // Get hospital info
        const hospitalDoc = await adminDb.collection('hospitals').doc(recordData.hospitalId).get();
        const hospitalData = hospitalDoc.data();

        return {
          id: doc.id,
          ...recordData,
          createdAt: recordData.createdAt.toDate().toISOString(),
          hospital: {
            name: hospitalData?.name || 'Unknown Hospital',
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error fetching records:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch records' },
      { status: 500 }
    );
  }
}
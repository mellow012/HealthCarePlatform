import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyAuth } from "@/lib/utils/server-auth";
export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';

    // Get medications
    const medicationsSnapshot = await adminDb
      .collection('medications')
      .where('patientId', '==', decodedToken.uid)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    const medications = medicationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate?.toDate().toISOString(),
        endDate: data.endDate?.toDate().toISOString(),
        createdAt: data.createdAt?.toDate().toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: medications });
  } catch (error: any) {
    console.error('Error fetching medications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch medications' },
      { status: 500 }
    );
  }
}

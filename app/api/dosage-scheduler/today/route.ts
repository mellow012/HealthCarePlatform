import { NextRequest,NextResponse } from "next/server";
import { verifyAuth } from "@/lib/utils/server-auth";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's schedules
    const schedulesSnapshot = await adminDb
      .collection('dosageSchedules')
      .where('patientId', '==', decodedToken.uid)
      .where('scheduledDateTime', '>=', today)
      .where('scheduledDateTime', '<', tomorrow)
      .orderBy('scheduledDateTime', 'asc')
      .get();

    const schedules = await Promise.all(
      schedulesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Get medication details
        const medDoc = await adminDb.collection('medications').doc(data.medicationId).get();
        const medData = medDoc.data();

        return {
          id: doc.id,
          ...data,
          scheduledDateTime: data.scheduledDateTime?.toDate().toISOString(),
          takenAt: data.takenAt?.toDate().toISOString(),
          medication: {
            name: medData?.name,
            dosage: medData?.dosage,
            instructions: medData?.instructions,
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    console.error('Error fetching today schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
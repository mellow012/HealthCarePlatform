import { NextRequest,NextResponse } from "next/server";
import { verifyAuth } from "@/lib/utils/server-auth";
import { adminDb } from "@/lib/firebase/admin";
export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId, notes } = await req.json();

    // Get schedule
    const scheduleRef = adminDb.collection('dosageSchedules').doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Update schedule
    await scheduleRef.update({
      status: 'taken',
      takenAt: new Date(),
      notes: notes || '',
    });

    // Update medication remaining doses
    const scheduleData = scheduleDoc.data();
    const medRef = adminDb.collection('medications').doc(scheduleData?.medicationId);
    const medDoc = await medRef.get();
    
    if (medDoc.exists) {
      const medData = medDoc.data();
      await medRef.update({
        remainingDoses: Math.max(0, (medData?.remainingDoses || 0) - 1),
        updatedAt: new Date(),
      });
    }

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decodedToken.uid,
      action: 'DOSE_TAKEN',
      resourceType: 'dosageSchedule',
      resourceId: scheduleId,
      metadata: { notes },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Dose marked as taken',
    });
  } catch (error: any) {
    console.error('Error marking dose:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark dose' },
      { status: 500 }
    );
  }
}
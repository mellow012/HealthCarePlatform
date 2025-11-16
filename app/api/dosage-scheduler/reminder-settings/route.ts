import { NextRequest,NextResponse } from "next/server";
import { verifyAuth } from "@/lib/utils/server-auth";
import { adminDb } from "@/lib/firebase/admin";

export async function PUT(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { medicationId, reminderEnabled, reminderMinutesBefore } = await req.json();

    await adminDb.collection('medications').doc(medicationId).update({
      reminderEnabled,
      reminderMinutesBefore,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder settings updated',
    });
  } catch (error: any) {
    console.error('Error updating reminder:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update reminder' },
      { status: 500 }
    );
  }
}
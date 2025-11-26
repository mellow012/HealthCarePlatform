// app/api/patient/scheduler/route.ts (ADAPTED TO YOUR STRUCTURE)
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

// GET - Fetch all schedules for patient
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

    const schedules = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        medicationName: data.medicationName || data.name,
        dosage: data.dosage,
        frequency: data.frequency,
        instructions: data.instructions || data.notes,
        source: data.source || 'manual',
        isActive: data.isActive !== false, // Default to true if not set
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        ...data, // Include all other fields
      };
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error) {
    console.error('GET /api/patient/scheduler error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// POST - Add manual medication entry
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  const session = await verifyAuth(sessionCookie);

  if (!session || !session.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { medicationName, dosage, frequency, timing, duration, durationUnit, instructions } = await req.json();

    if (!medicationName) {
      return NextResponse.json({ error: 'medicationName is required' }, { status: 400 });
    }

    const now = new Date();
    
    const scheduleData = {
      medicationName,
      dosage: dosage || '1 tablet',
      frequency: frequency || 'once_daily',
      timing: timing || '',
      duration: {
        value: parseInt(duration) || 7,
        unit: durationUnit || 'days',
      },
      instructions: instructions || '',
      source: 'manual',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const scheduleRef = await adminDb
      .collection('users')
      .doc(session.uid)
      .collection('schedules')
      .add(scheduleData);

    return NextResponse.json({
      success: true,
      data: { id: scheduleRef.id, message: 'Medication added to schedule' },
    });
  } catch (error: any) {
    console.error('POST /api/patient/scheduler error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add medication' }, { status: 500 });
  }
}

// DELETE - Remove a medication from schedule
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  const session = await verifyAuth(sessionCookie);

  if (!session || !session.uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json({ error: 'Schedule ID required' }, { status: 400 });
    }

    // Soft delete
    await adminDb
      .collection('users')
      .doc(session.uid)
      .collection('schedules')
      .doc(scheduleId)
      .update({
        isActive: false,
        deletedAt: new Date(),
      });

    return NextResponse.json({ success: true, message: 'Medication removed from schedule' });
  } catch (error: any) {
    console.error('DELETE /api/patient/scheduler error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
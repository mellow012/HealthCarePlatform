// app/api/doctor/appointments/[appointmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

// GET single appointment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const doc = await adminDb.collection('appointments').doc(appointmentId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const data = doc.data()!;

    // Verify access (same hospital)
    if (data.hospitalId !== decoded.hospitalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch patient
    const patientDoc = await adminDb.collection('users').doc(data.patientId).get();
    const patient = patientDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString(),
        patient: {
          id: patientDoc.id,
          email: patient?.email || '',
          profile: patient?.profile || {},
        },
      },
    });
  } catch (err: any) {
    console.error('GET appointment error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH - Update appointment (status change, reschedule, etc.)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded || !['doctor', 'receptionist', 'hospital_admin'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await req.json();
    const allowedFields = ['status', 'date', 'timeSlot', 'notes', 'reason', 'visitId', 'diagnosisId'];

    // Filter to only allowed fields
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = key === 'date' ? new Date(updates[key]) : updates[key];
      }
    }
    sanitizedUpdates.updatedAt = new Date();

    await adminDb.collection('appointments').doc(appointmentId).update(sanitizedUpdates);

    return NextResponse.json({ success: true, message: 'Appointment updated' });
  } catch (err: any) {
    console.error('PATCH appointment error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// DELETE - Cancel appointment
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Soft delete - just mark as cancelled
    await adminDb.collection('appointments').doc(appointmentId).update({
      status: 'cancelled',
      updatedAt: new Date(),
      cancelledBy: decoded.uid,
    });

    return NextResponse.json({ success: true, message: 'Appointment cancelled' });
  } catch (err: any) {
    console.error('DELETE appointment error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
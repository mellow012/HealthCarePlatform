// app/api/doctor/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyDoctor } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const doctor = await verifyDoctor(sessionCookie);

    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    let query: FirebaseFirestore.Query = adminDb
      .collection('appointments')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('doctorId', '==', doctor.uid);

    if (dateStr) {
      const startOfDay = new Date(dateStr);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .where('date', '>=', startOfDay)
        .where('date', '<=', endOfDay);
    }

    const snapshot = await query.orderBy('date', 'asc').get();

    const appointments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const patientDoc = await adminDb.collection('users').doc(data.patientId).get();
        const patient = patientDoc.data();

        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate?.()?.toISOString() || data.date,
          createdAt: data.createdAt?.toDate?.()?.toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          patient: {
            id: patientDoc.id,
            email: patient?.email || '',
            profile: patient?.profile || {},
          },
        };
      })
    );

    return NextResponse.json({ success: true, data: appointments });
  } catch (err: any) {
    console.error('GET /api/doctor/appointments error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const doctor = await verifyDoctor(sessionCookie);

    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { patientId, doctorId, department, date, timeSlot, reason, duration = 30 } = await req.json();

    if (!patientId || !date || !timeSlot) {
      return NextResponse.json({ error: 'patientId, date, and timeSlot are required' }, { status: 400 });
    }

    const targetDoctorId = doctorId || doctor.uid;
    const appointmentDate = new Date(date);

    // Conflict check
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictCheck = await adminDb
      .collection('appointments')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('doctorId', '==', targetDoctorId)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .where('timeSlot', '==', timeSlot)
      .where('status', 'in', ['scheduled', 'checked_in', 'in_progress'])
      .get();

    if (!conflictCheck.empty) {
      return NextResponse.json({ error: 'Time slot already booked' }, { status: 409 });
    }

    const appointmentData = {
      hospitalId: doctor.hospitalId,
      patientId,
      doctorId: targetDoctorId,
      department: department || doctor.department || 'General',
      date: appointmentDate,
      timeSlot,
      duration,
      reason: reason || '',
      status: 'scheduled',
      createdAt: new Date(),
      createdBy: doctor.uid,
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('appointments').add(appointmentData);

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...appointmentData },
    });
  } catch (err: any) {
    console.error('POST /api/doctor/appointments error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
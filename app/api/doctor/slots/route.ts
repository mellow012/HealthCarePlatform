// app/api/doctor/slots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

// GET available slots for a doctor on a given date
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded || !decoded.hospitalId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const dateStr = searchParams.get('date'); // "2025-01-15"

    if (!doctorId || !dateStr) {
      return NextResponse.json({ error: 'doctorId and date are required' }, { status: 400 });
    }

    // Define working hours (could be fetched from doctor's schedule in production)
    const workingSlots = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    ];

    // Get booked slots for this doctor on this date
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSnapshot = await adminDb
      .collection('appointments')
      .where('hospitalId', '==', decoded.hospitalId)
      .where('doctorId', '==', doctorId)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .where('status', 'in', ['scheduled', 'checked_in', 'in_progress'])
      .get();

    const bookedSlots = bookedSnapshot.docs.map((doc) => doc.data().timeSlot);

    // Calculate available slots
    const availableSlots = workingSlots.filter((slot) => !bookedSlots.includes(slot));

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        doctorId,
        available: availableSlots,
        booked: bookedSlots,
      },
    });
  } catch (err: any) {
    console.error('GET slots error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
// app/api/doctor/stats/route.ts
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

    // Get today's date range
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Count completed visits today
    const completedSnapshot = await adminDb
      .collection('visits')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('department', '==', doctor.department)
      .where('status', '==', 'completed')
      .where('checkInTime', '>=', startOfDay)
      .where('checkInTime', '<=', endOfDay)
      .count()
      .get();

    // Count total visits today
    const totalSnapshot = await adminDb
      .collection('visits')
      .where('hospitalId', '==', doctor.hospitalId)
      .where('department', '==', doctor.department)
      .where('checkInTime', '>=', startOfDay)
      .where('checkInTime', '<=', endOfDay)
      .count()
      .get();

    return NextResponse.json({
      success: true,
      data: {
        completed: completedSnapshot.data().count,
        todayTotal: totalSnapshot.data().count,
      },
    });
  } catch (err: any) {
    console.error('GET /api/doctor/stats error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
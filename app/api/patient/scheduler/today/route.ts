// app/api/patient/scheduler/today/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await verifyAuth(sessionCookie);

    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch active schedules
    const schedulesSnap = await adminDb
      .collection('users')
      .doc(session.uid)
      .collection('schedules')
      .where('isActive', '==', true)
      .get();

    const schedules = schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Generate today's doses
    const todayDoses: any[] = [];
    const upcomingDoses: any[] = [];
    const currentTime = new Date();

    for (const schedule of schedules) {
      const times = schedule.specificTimes || ['08:00'];
      
      for (const time of times) {
        const [hours, minutes] = time.split(':');
        const doseTime = new Date(today);
        doseTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Check if dose exists in intake log
        const logEntry = schedule.intakeLog?.find((log: any) => {
          const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
          return logDate.toDateString() === today.toDateString() && log.time === time;
        });

        const dose = {
          id: `${schedule.id}-${time}`,
          scheduleId: schedule.id,
          medicationName: schedule.medicationName,
          dosage: schedule.dosage,
          time,
          status: logEntry?.status || (doseTime < currentTime ? 'missed' : 'pending'),
          timestamp: logEntry?.timestamp,
        };

        if (doseTime.toDateString() === today.toDateString()) {
          todayDoses.push(dose);
        } else if (doseTime > currentTime && doseTime < tomorrow) {
          upcomingDoses.push(dose);
        }
      }
    }

    // Sort by time
    todayDoses.sort((a, b) => a.time.localeCompare(b.time));
    upcomingDoses.sort((a, b) => a.time.localeCompare(b.time));

    // Calculate stats
    const takenToday = todayDoses.filter(d => d.status === 'taken').length;
    const missedToday = todayDoses.filter(d => d.status === 'missed').length;
    const adherenceRate = todayDoses.length > 0 
      ? Math.round((takenToday / todayDoses.length) * 100) 
      : 100;

    // Calculate streak (mock for now - would need historical data)
    const streak = 7; // TODO: Calculate from historical logs

    const stats = {
      totalMedications: schedules.length,
      todayDoses: todayDoses.length,
      takenToday,
      missedToday,
      adherenceRate,
      streak,
    };

    return NextResponse.json({
      success: true,
      data: {
        schedule: todayDoses,
        upcoming: upcomingDoses,
        stats,
      },
    });
  } catch (error: any) {
    console.error('GET /api/patient/scheduler/today error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}


// app/api/patient/scheduler/history/route.ts
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

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7days';

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    switch (range) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate.setFullYear(startDate.getFullYear() - 1); // Last year
        break;
    }
    startDate.setHours(0, 0, 0, 0);

    // Fetch all schedules
    const schedulesSnap = await adminDb
      .collection('users')
      .doc(session.uid)
      .collection('schedules')
      .get();

    const history: any[] = [];
    const weeklyData: Record<string, { total: number; taken: number; missed: number }> = {};

    // Process each schedule's intake log
    for (const doc of schedulesSnap.docs) {
      const schedule = doc.data();
      const intakeLog = schedule.intakeLog || [];

      for (const log of intakeLog) {
        const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
        
        if (logDate >= startDate && logDate <= endDate) {
          const dateStr = logDate.toISOString().split('T')[0];
          
          history.push({
            id: `${doc.id}-${log.time}-${logDate.getTime()}`,
            scheduleId: doc.id,
            medicationName: schedule.medicationName,
            dosage: schedule.dosage,
            time: log.time,
            status: log.status,
            timestamp: logDate.toISOString(),
            date: dateStr,
          });

          // Aggregate weekly stats
          const weekKey = getWeekKey(logDate);
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { total: 0, taken: 0, missed: 0 };
          }
          weeklyData[weekKey].total++;
          if (log.status === 'taken') weeklyData[weekKey].taken++;
          if (log.status === 'missed') weeklyData[weekKey].missed++;
        }
      }
    }

    // Sort history by date and time (most recent first)
    history.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });

    // Format weekly stats
    const weeklyStats = Object.entries(weeklyData).map(([week, data]) => ({
      week,
      totalDoses: data.total,
      takenDoses: data.taken,
      missedDoses: data.missed,
      adherenceRate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0,
    })).sort((a, b) => a.week.localeCompare(b.week));

    return NextResponse.json({
      success: true,
      data: {
        history,
        weeklyStats,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error: any) {
    console.error('GET /api/patient/scheduler/history error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// Helper to get week identifier (e.g., "Mon" for display)
function getWeekKey(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}
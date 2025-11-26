import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;
    const session = await verifyAuth(sessionCookie);

    if (!session || !session.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { doseId, status, timestamp } = await req.json();

    if (!doseId || !status) {
      return NextResponse.json({ error: 'doseId and status are required' }, { status: 400 });
    }

    // Parse doseId (format: {scheduleId}-{time})
    const [scheduleId, time] = doseId.split('-');

    if (!scheduleId || !time) {
      return NextResponse.json({ error: 'Invalid doseId format' }, { status: 400 });
    }

    const scheduleRef = adminDb
      .collection('users')
      .doc(session.uid)
      .collection('schedules')
      .doc(scheduleId);

    const scheduleDoc = await scheduleRef.get();
    
    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const scheduleData = scheduleDoc.data()!;
    const intakeLog = scheduleData.intakeLog || [];

    // Update or add log entry
    const existingLogIndex = intakeLog.findIndex((log: any) => {
      const logDate = log.timestamp?.toDate?.() || new Date(log.timestamp);
      return logDate.toDateString() === new Date().toDateString() && log.time === time;
    });

    const logEntry = {
      time,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      recordedAt: new Date(),
    };

    if (existingLogIndex >= 0) {
      intakeLog[existingLogIndex] = logEntry;
    } else {
      intakeLog.push(logEntry);
    }

    // Update adherence stats
    const totalLogs = intakeLog.length;
    const takenCount = intakeLog.filter((log: any) => log.status === 'taken').length;
    const adherenceRate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 100;
    const missedDoses = intakeLog.filter((log: any) => log.status === 'missed').length;

    await scheduleRef.update({
      intakeLog,
      adherenceRate,
      missedDoses,
      lastTaken: status === 'taken' ? new Date() : scheduleData.lastTaken,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Dose marked as ${status}`,
    });
  } catch (error: any) {
    console.error('POST /api/dosage-scheduler/mark-taken error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
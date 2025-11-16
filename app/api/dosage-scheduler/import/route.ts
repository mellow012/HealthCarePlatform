
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/middleware/auth';

export async function POST(req: NextRequest) {
  try {
    const decodedToken = await verifyAuth(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      recordId, 
      medicationData,
      timings,
      reminderEnabled,
      reminderMinutesBefore 
    } = await req.json();

    // Validate required fields
    if (!recordId || !medicationData || !timings || timings.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const duration = parseInt(medicationData.duration) || 7; // Default 7 days
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration);

    // Calculate total doses
    const dailyDoses = timings.length;
    const totalDoses = dailyDoses * duration;

    // Create medication document
    const medicationId = `med_${decodedToken.uid}_${Date.now()}`;
    const medicationDoc = {
      id: medicationId,
      patientId: decodedToken.uid,
      name: medicationData.name,
      dosage: medicationData.dosage,
      frequency: mapFrequencyFromText(medicationData.frequency),
      timings,
      startDate,
      endDate,
      duration,
      prescribedBy: medicationData.prescribedBy || 'Unknown',
      purpose: medicationData.purpose || '',
      instructions: medicationData.instructions || '',
      totalDoses,
      remainingDoses: totalDoses,
      reminderEnabled: reminderEnabled || false,
      reminderMinutesBefore: reminderMinutesBefore || 15,
      importedFrom: recordId,
      importedAt: new Date(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('medications').doc(medicationId).set(medicationDoc);

    // Generate schedule
    await generateSchedule(medicationId, medicationDoc);

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decodedToken.uid,
      action: 'MEDICATION_IMPORTED',
      resourceType: 'medication',
      resourceId: medicationId,
      metadata: { recordId, medicationName: medicationData.name },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Medication imported successfully',
      data: { medicationId, totalSchedules: totalDoses },
    });
  } catch (error: any) {
    console.error('Error importing medication:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import medication' },
      { status: 500 }
    );
  }
}

// Helper: Map frequency text to enum
function mapFrequencyFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('once') || lower.includes('1')) return 'once_daily';
  if (lower.includes('twice') || lower.includes('2')) return 'twice_daily';
  if (lower.includes('three') || lower.includes('3')) return 'three_times_daily';
  if (lower.includes('four') || lower.includes('4')) return 'four_times_daily';
  if (lower.includes('every') && lower.includes('hour')) return 'every_x_hours';
  return 'as_needed';
}

// Helper: Generate schedule
async function generateSchedule(medicationId: string, medication: any) {
  const schedules = [];
  const currentDate = new Date(medication.startDate);
  const endDate = new Date(medication.endDate);

  while (currentDate <= endDate) {
    for (const timing of medication.timings) {
      const [hours, minutes] = timing.split(':');
      const scheduleDateTime = new Date(currentDate);
      scheduleDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Only create schedules for future times
      if (scheduleDateTime > new Date()) {
        const scheduleId = `schedule_${medicationId}_${scheduleDateTime.getTime()}`;
        const scheduleDoc = {
          id: scheduleId,
          medicationId,
          patientId: medication.patientId,
          scheduledDateTime: scheduleDateTime,
          status: 'pending',
          reminderSent: false,
          createdAt: new Date(),
        };

        schedules.push(scheduleDoc);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Batch write schedules
  const batch = adminDb.batch();
  schedules.forEach(schedule => {
    const ref = adminDb.collection('dosageSchedules').doc(schedule.id);
    batch.set(ref, schedule);
  });

  await batch.commit();
  console.log(`Generated ${schedules.length} schedules for medication ${medicationId}`);
}
// app/api/patient/scheduler/import/route.ts (ADAPTED TO YOUR STRUCTURE)
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

    const { medications, sourceRecordId } = await req.json();

    if (!medications || !Array.isArray(medications) || medications.length === 0) {
      return NextResponse.json({ error: 'medications array is required' }, { status: 400 });
    }

    const scheduleIds: string[] = [];
    const now = new Date();
    const patientSchedulesRef = adminDb.collection('users').doc(session.uid).collection('schedules');

    // Process each medication
    for (const med of medications) {
      if (!med.medication?.trim()) continue;

      // Check if already imported (prevent duplicates)
      const existingCheck = await patientSchedulesRef
        .where('medicationName', '==', med.medication)
        .where('source', '==', 'doctor_prescription')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!existingCheck.empty) {
        console.log(`Medication "${med.medication}" already imported, skipping...`);
        continue;
      }

      // Parse frequency to get times per day
      const frequencyMap: Record<string, number> = {
        'once_daily': 1,
        'twice_daily': 2,
        'three_times_daily': 3,
        'four_times_daily': 4,
        'every_12_hours': 2,
        'every_8_hours': 3,
        'every_6_hours': 4,
        'as_needed': 0,
      };

      const frequency = med.frequency || 'once_daily';
      const timesPerDay = frequencyMap[frequency] || 1;

      // Generate default times based on frequency
      const defaultTimesMap: Record<string, string[]> = {
        'once_daily': ['08:00'],
        'twice_daily': ['08:00', '20:00'],
        'three_times_daily': ['08:00', '14:00', '20:00'],
        'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
        'every_12_hours': ['08:00', '20:00'],
        'every_8_hours': ['08:00', '16:00', '00:00'],
      };

      const specificTimes = med.specificTimes || defaultTimesMap[frequency] || ['08:00'];

      // Parse duration
      let durationValue = 7;
      let durationUnit = 'days';

      if (med.duration) {
        const durationMatch = med.duration.match(/(\d+)\s*(day|week|month|ongoing)/i);
        if (durationMatch) {
          durationValue = parseInt(durationMatch[1]);
          durationUnit = durationMatch[2].toLowerCase();
        }
      }

      // Calculate end date
      let endDate = null;
      if (durationUnit !== 'ongoing') {
        endDate = new Date(now);
        if (durationUnit === 'days') {
          endDate.setDate(endDate.getDate() + durationValue);
        } else if (durationUnit === 'weeks') {
          endDate.setDate(endDate.getDate() + (durationValue * 7));
        } else if (durationUnit === 'months') {
          endDate.setMonth(endDate.getMonth() + durationValue);
        }
      }

      // Create schedule entry
      const scheduleData = {
        medicationName: med.medication,
        dosage: med.dosage || '1 tablet',
        frequency,
        timesPerDay,
        specificTimes,
        timing: med.timing || '',
        duration: {
          value: durationValue,
          unit: durationUnit,
          startDate: now,
          endDate,
        },
        instructions: med.instructions || med.notes || '',
        source: 'doctor_prescription',
        sourceRecordId: sourceRecordId || 'passport-import',
        isActive: true,
        
        // Adherence tracking
        intakeLog: [],
        missedDoses: 0,
        adherenceRate: 100,
        
        createdAt: now,
        updatedAt: now,
      };

      const scheduleRef = await patientSchedulesRef.add(scheduleData);
      scheduleIds.push(scheduleRef.id);

      console.log(`✅ Imported medication: ${med.medication} (${scheduleRef.id})`);

      // Mark prescription as imported (if sourceRecordId provided)
      if (sourceRecordId && sourceRecordId.startsWith('passport-')) {
        const prescriptionId = sourceRecordId.replace('passport-', '');
        try {
          await adminDb.collection('prescriptions').doc(prescriptionId).update({
            importedToScheduler: true,
            importedAt: now,
          });
          console.log(`✅ Marked prescription ${prescriptionId} as imported`);
        } catch (err) {
          console.log('⚠️ Could not update prescription import status:', err);
        }
      }
    }

    if (scheduleIds.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No new medications to import (may already be in your schedule)',
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduleIds,
        count: scheduleIds.length,
        message: `${scheduleIds.length} medication(s) added to your schedule`,
      },
    });
  } catch (err: any) {
    console.error('POST /api/patient/scheduler/import error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
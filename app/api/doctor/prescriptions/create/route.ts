// app/api/doctor/prescriptions/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyDoctor } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

// Helper functions (same as diagnosis route)
function getTimesPerDay(frequency: string): number {
  const map: Record<string, number> = {
    'once_daily': 1,
    'twice_daily': 2,
    'three_times_daily': 3,
    'four_times_daily': 4,
    'every_12_hours': 2,
    'every_8_hours': 3,
    'every_6_hours': 4,
    'as_needed': 0,
  };
  return map[frequency] || 1;
}

function getDefaultTimes(frequency: string): string[] {
  const timesMap: Record<string, string[]> = {
    'once_daily': ['08:00'],
    'twice_daily': ['08:00', '20:00'],
    'three_times_daily': ['08:00', '14:00', '20:00'],
    'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
  };
  return timesMap[frequency] || ['08:00'];
}

function calculateEndDate(startDate: Date, duration: number, unit: string): Date | null {
  if (unit === 'ongoing') return null;
  
  const endDate = new Date(startDate);
  switch (unit) {
    case 'days':
      endDate.setDate(endDate.getDate() + duration);
      break;
    case 'weeks':
      endDate.setDate(endDate.getDate() + (duration * 7));
      break;
    case 'months':
      endDate.setMonth(endDate.getMonth() + duration);
      break;
  }
  return endDate;
}

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const doctor = await verifyDoctor(sessionCookie);

    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { patientId, medications } = await req.json();

    if (!patientId || !medications || medications.length === 0) {
      return NextResponse.json({ error: 'patientId and medications are required' }, { status: 400 });
    }

    const startDate = new Date();
    const prescriptionIds: string[] = [];

    // Create prescriptions
    for (const med of medications) {
      if (!med.name?.trim()) continue;

      const prescriptionRef = adminDb.collection('prescriptions').doc();
      
      const frequency = med.frequency || 'once_daily';
      const durationValue = parseInt(med.duration) || 7;
      const durationUnit = med.durationUnit || 'days';

      const prescriptionData = {
        hospitalId: doctor.hospitalId,
        patientId,
        doctorId: doctor.uid,
        doctorName: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
        
        medication: {
          name: med.name.trim(),
          genericName: med.genericName || '',
          form: med.form || 'tablet',
          strength: med.strength || '',
        },

        dosage: {
          quantity: med.quantity || 1,
          unit: med.unit || 'tablet',
          frequency,
          timesPerDay: getTimesPerDay(frequency),
          specificTimes: getDefaultTimes(frequency),
          timing: med.timing || '',
        },

        duration: {
          value: durationValue,
          unit: durationUnit,
          startDate,
          endDate: calculateEndDate(startDate, durationValue, durationUnit),
        },

        instructions: med.instructions || '',
        status: 'active',
        importedToScheduler: false,
        
        createdAt: startDate,
        updatedAt: startDate,
      };

      await prescriptionRef.set(prescriptionData);
      prescriptionIds.push(prescriptionRef.id);

      // Also update e-health passport
      const passportRef = adminDb.collection('eHealthPassports').doc(patientId);
      await passportRef.set({
        prescriptions: adminDb.FieldValue.arrayUnion({
          medication: med.name,
          dosage: `${med.quantity} ${med.unit}`,
          frequency: med.frequency,
          duration: `${med.duration} ${med.durationUnit}`,
          prescribedBy: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
          prescribedDate: startDate.toISOString(),
          instructions: med.instructions || '',
          status: 'active'
        }),
        updatedAt: startDate,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      data: { prescriptionIds, count: prescriptionIds.length },
    });
  } catch (err: any) {
    console.error('Create prescription error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create prescription' }, { status: 500 });
  }
}
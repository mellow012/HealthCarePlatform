// app/api/doctor/diagnosis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyDoctor } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

interface MedicationInput {
  name: string;
  genericName?: string;
  form?: string;
  strength?: string;
  dosage: string;
  quantity?: number;
  unit?: string;
  frequency: string;
  timesPerDay?: number;
  specificTimes?: string[];
  timing?: string;
  duration: string;
  durationUnit?: string;
  instructions?: string;
  refills?: number;
  dispenseQuantity?: number;
}

// Helper to parse frequency into times per day
function getTimesPerDay(frequency: string): number {
  const map: Record<string, number> = {
    'once_daily': 1,
    'twice_daily': 2,
    'three_times_daily': 3,
    'four_times_daily': 4,
    'every_12_hours': 2,
    'every_8_hours': 3,
    'every_6_hours': 4,
    'every_4_hours': 6,
    'as_needed': 0,
  };
  return map[frequency] || 1;
}

// Helper to generate default times based on frequency
function getDefaultTimes(frequency: string): string[] {
  const timesMap: Record<string, string[]> = {
    'once_daily': ['08:00'],
    'twice_daily': ['08:00', '20:00'],
    'three_times_daily': ['08:00', '14:00', '20:00'],
    'four_times_daily': ['08:00', '12:00', '16:00', '20:00'],
    'every_12_hours': ['08:00', '20:00'],
    'every_8_hours': ['08:00', '16:00', '00:00'],
    'every_6_hours': ['06:00', '12:00', '18:00', '00:00'],
  };
  return timesMap[frequency] || ['08:00'];
}

// Helper to calculate end date
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

    const { patientId, visitId, diagnosis, recommendations, medications } = await req.json();

    if (!patientId || !visitId || !diagnosis) {
      return NextResponse.json(
        { error: 'patientId, visitId, and diagnosis are required' },
        { status: 400 }
      );
    }

    const visitRef = adminDb.collection('visits').doc(visitId);
    const diagnosisCollectionRef = adminDb.collection('diagnosis_records');
    const prescriptionsCollectionRef = adminDb.collection('prescriptions');

    let diagnosisId: string = '';
    const prescriptionIds: string[] = [];

    await adminDb.runTransaction(async (transaction) => {
      // Verify visit
      const visitDoc = await transaction.get(visitRef);
      if (!visitDoc.exists || visitDoc.data()?.hospitalId !== doctor.hospitalId) {
        throw new Error('Visit not found or unauthorized');
      }
      if (visitDoc.data()?.status === 'completed') {
        throw new Error('Consultation already completed');
      }

      // Create diagnosis record
      const diagnosisRef = diagnosisCollectionRef.doc();
      diagnosisId = diagnosisRef.id;

      const diagnosisData = {
        hospitalId: doctor.hospitalId,
        patientId,
        visitId,
        doctorId: doctor.uid,
        doctorName: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
        department: doctor.department,
        diagnosis,
        recommendations: recommendations || '',
        medicationCount: (medications || []).filter((m: MedicationInput) => m.name?.trim()).length,
        createdAt: new Date(),
      };

      transaction.set(diagnosisRef, diagnosisData);

      // Create individual prescription records
      const validMedications = (medications || []).filter((m: MedicationInput) => m.name?.trim());
      const startDate = new Date();

      for (const med of validMedications) {
        const prescriptionRef = prescriptionsCollectionRef.doc();
        prescriptionIds.push(prescriptionRef.id);

        const frequency = med.frequency || 'once_daily';
        const durationValue = parseInt(med.duration) || 7;
        const durationUnit = med.durationUnit || 'days';
        const timesPerDay = med.timesPerDay || getTimesPerDay(frequency);
        const specificTimes = med.specificTimes?.length ? med.specificTimes : getDefaultTimes(frequency);

        const prescriptionData = {
          // References
          hospitalId: doctor.hospitalId,
          patientId,
          doctorId: doctor.uid,
          doctorName: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
          diagnosisId,
          visitId,

          // Medication details
          medication: {
            name: med.name.trim(),
            genericName: med.genericName || '',
            form: med.form || 'tablet',
            strength: med.strength || med.dosage || '',
          },

          // Dosage for scheduler
          dosage: {
            quantity: med.quantity || 1,
            unit: med.unit || 'tablet',
            frequency,
            timesPerDay,
            specificTimes,
            timing: med.timing || '',
          },

          // Duration
          duration: {
            value: durationValue,
            unit: durationUnit,
            startDate,
            endDate: calculateEndDate(startDate, durationValue, durationUnit),
          },

          // Additional
          instructions: med.instructions || '',
          refills: med.refills || 0,
          dispenseQuantity: med.dispenseQuantity || (durationValue * timesPerDay * (med.quantity || 1)),

          // Status
          status: 'active',
          importedToScheduler: false,

          // Metadata
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        transaction.set(prescriptionRef, prescriptionData);
      }

      // Update visit status
      transaction.update(visitRef, {
        status: 'completed',
        diagnosisId,
        prescriptionIds,
        endTime: new Date(),
      });

      // Update patient record
      const patientRef = adminDb.collection('users').doc(patientId);
      transaction.update(patientRef, {
        lastVisitSummary: diagnosis,
        lastVisitDate: new Date(),
        lastDoctorId: doctor.uid,
        lastDoctorName: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        diagnosisId,
        prescriptionIds,
        message: 'Diagnosis and prescriptions saved successfully',
      },
    });
  } catch (err: any) {
    console.error('POST /api/doctor/diagnosis error:', err);
    return NextResponse.json({ error: err.message || 'Failed to save' }, { status: 500 });
  }
}
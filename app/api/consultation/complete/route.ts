import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  // 1. Get session cookie and verify
  const sessionCookie = req.cookies.get('session')?.value;
  const session = await verifyAuth(sessionCookie);

  // 2. Check authentication and authorization
  if (!session || !session.hospitalId || !['doctor', 'admin', 'hospital_admin'].includes(session.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { 
      appointmentId, 
      patientId, 
      diagnosis, 
      symptoms, 
      clinicalNotes, 
      prescriptions 
    } = await req.json();

    const doctorName = (session.name as string) || 'Doctor';
    const visitDate = new Date().toISOString();

    // 3. Create the Medical Record (Immutable Log)
    const recordData = {
      patientId,
      hospitalId: session.hospitalId,
      doctorId: session.uid,
      doctorName,
      date: visitDate,
      type: 'Consultation',
      diagnosis,
      symptoms,
      notes: clinicalNotes,
      prescriptions: prescriptions || [],
      createdAt: visitDate,
    };

    const recordRef = await adminDb.collection('medicalRecords').add(recordData);

    // 4. Update the Appointment Status
    await adminDb.collection('appointments').doc(appointmentId).update({
      status: 'completed',
      completedAt: visitDate,
      medicalRecordId: recordRef.id
    });

    // 5. Update E-Health Passport (The Living Document)
    const passportRef = adminDb.collection('eHealthPassports').doc(patientId);
    
    // Prepare prescription objects for the passport (add metadata like date/doctor)
    const passportPrescriptions = (prescriptions || []).map((p: any) => ({
      ...p,
      prescribedBy: doctorName,
      prescribedDate: visitDate,
      status: 'active'
    }));

    await passportRef.set({
        // Use arrayUnion to append to existing arrays without overwriting
        diagnoses: FieldValue.arrayUnion({
            condition: diagnosis,
            diagnosedBy: doctorName,
            date: visitDate,
            notes: clinicalNotes
        }),
        prescriptions: FieldValue.arrayUnion(...passportPrescriptions),
        updatedAt: visitDate
    }, { merge: true });

    // 6. Update Patient's Last Visit in User Doc
    await adminDb.collection('users').doc(patientId).update({
      lastVisit: visitDate,
    });

    // 7. Create Audit Log (NEW)
    await adminDb.collection('auditLogs').add({
        userId: session.uid, // The Doctor's ID
        action: 'CONSULTATION_COMPLETED',
        resourceType: 'medicalRecord',
        resourceId: recordRef.id,
        hospitalId: session.hospitalId,
        metadata: {
            patientId: patientId,
            appointmentId: appointmentId,
            diagnosisSummary: diagnosis,
            prescriptionCount: prescriptions?.length || 0,
            doctorName: doctorName
        },
        timestamp: new Date(),
        ip: req.headers.get('x-forwarded-for') // Optional: Track IP for security
    });

    return NextResponse.json({ success: true, recordId: recordRef.id });

  } catch (error) {
    console.error('Consultation completion error:', error);
    return NextResponse.json({ error: 'Failed to save consultation' }, { status: 500 });
  }
}
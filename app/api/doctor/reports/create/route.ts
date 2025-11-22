// app/api/doctor/reports/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyDoctor } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const doctor = await verifyDoctor(sessionCookie);

    if (!doctor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { patientId, diagnosis, symptoms, physicalExam, vitalSigns, labResults, recommendations, followUpDate, notes } = await req.json();

    if (!patientId || !diagnosis) {
      return NextResponse.json({ error: 'patientId and diagnosis are required' }, { status: 400 });
    }

    const reportDate = new Date();
    const reportRef = adminDb.collection('medical_reports').doc();

    const reportData = {
      hospitalId: doctor.hospitalId,
      patientId,
      doctorId: doctor.uid,
      doctorName: `${doctor.profile?.firstName || ''} ${doctor.profile?.lastName || ''}`.trim(),
      department: doctor.department,
      
      diagnosis,
      symptoms: symptoms || '',
      physicalExam: physicalExam || '',
      vitalSigns: vitalSigns || {},
      labResults: labResults || '',
      recommendations: recommendations || '',
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes: notes || '',
      
      reportDate,
      createdAt: reportDate,
      updatedAt: reportDate,
    };

    await reportRef.set(reportData);

    // Update E-Health Passport
    const passportRef = adminDb.collection('eHealthPassports').doc(patientId);
    await passportRef.set({
      diagnoses: adminDb.FieldValue.arrayUnion({
        condition: diagnosis,
        diagnosedBy: reportData.doctorName,
        date: reportDate.toISOString(),
        notes: recommendations || symptoms || '',
        reportId: reportRef.id,
      }),
      updatedAt: reportDate,
    }, { merge: true });

    // Update patient's last visit
    await adminDb.collection('users').doc(patientId).update({
      lastVisitSummary: diagnosis,
      lastVisitDate: reportDate,
      lastDoctorId: doctor.uid,
      lastDoctorName: reportData.doctorName,
    });

    return NextResponse.json({
      success: true,
      data: { reportId: reportRef.id, message: 'Report created successfully' },
    });
  } catch (err: any) {
    console.error('Create report error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create report' }, { status: 500 });
  }
}
// app/api/patient/ehealth-passport/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

async function verifyPatient(session: string | undefined) {
  if (!session) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();

    if (userSnap.exists && userData?.role === 'patient') {
      return { uid: decoded.uid, data: userData };
    }
    return null;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const patient = await verifyPatient(sessionCookie);

    if (!patient) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const patientId = patient.uid;

    // 1. Check passport status
    const passportDoc = await adminDb.collection('eHealthPassports').doc(patientId).get();
    
    if (!passportDoc.exists || !passportDoc.data()?.isActive) {
      return NextResponse.json({
        success: false,
        error: 'PASSPORT_NOT_ACTIVATED',
        message: 'E-Health Passport not activated. Check in at any hospital to activate.',
      }, { status: 404 });
    }

    const passportData = passportDoc.data()!;

    // 2. Fetch COMPLETE patient profile
    const userDoc = await adminDb.collection('users').doc(patientId).get();
    const userData = userDoc.data() || {};
    const profile = userData.profile || {};

    // 3. Fetch ALL diagnoses from multiple sources
    const diagnoses: any[] = [];
    
    // From visits collection
    const visitsSnap = await adminDb
      .collection('visits')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    for (const doc of visitsSnap.docs) {
      const visit = doc.data();
      if (visit.diagnosis?.trim()) {
        // Fetch hospital name
        let hospitalName = 'Unknown Hospital';
        if (visit.hospitalId) {
          const hospitalDoc = await adminDb.collection('hospitals').doc(visit.hospitalId).get();
          hospitalName = hospitalDoc.exists ? hospitalDoc.data()?.name : hospitalName;
        }

        diagnoses.push({
          condition: visit.diagnosis,
          date: visit.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          diagnosedBy: visit.doctorName || 'Unknown Doctor',
          hospital: hospitalName,
          notes: visit.recommendations || visit.notes || '',
          source: 'visit',
          visitId: doc.id,
        });
      }
    }

    // From diagnosis_records collection
    const diagnosisSnap = await adminDb
      .collection('diagnosis_records')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    for (const doc of diagnosisSnap.docs) {
      const diag = doc.data();
      let hospitalName = 'Unknown Hospital';
      if (diag.hospitalId) {
        const hospitalDoc = await adminDb.collection('hospitals').doc(diag.hospitalId).get();
        hospitalName = hospitalDoc.exists ? hospitalDoc.data()?.name : hospitalName;
      }

      diagnoses.push({
        condition: diag.diagnosis,
        date: diag.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        diagnosedBy: diag.doctorName || 'Unknown Doctor',
        hospital: hospitalName,
        notes: diag.recommendations || '',
        source: 'diagnosis_record',
        recordId: doc.id,
      });
    }

    // From medical_reports collection
    const reportsSnap = await adminDb
      .collection('medical_reports')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    for (const doc of reportsSnap.docs) {
      const report = doc.data();
      let hospitalName = 'Unknown Hospital';
      if (report.hospitalId) {
        const hospitalDoc = await adminDb.collection('hospitals').doc(report.hospitalId).get();
        hospitalName = hospitalDoc.exists ? hospitalDoc.data()?.name : hospitalName;
      }

      diagnoses.push({
        condition: report.diagnosis,
        date: report.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        diagnosedBy: report.doctorName || 'Unknown Doctor',
        hospital: hospitalName,
        notes: report.recommendations || report.notes || '',
        vitalSigns: report.vitalSigns || null,
        labResults: report.labResults || null,
        source: 'medical_report',
        reportId: doc.id,
      });
    }

    // 4. Fetch ALL active prescriptions
    const prescriptionsSnap = await adminDb
      .collection('prescriptions')
      .where('patientId', '==', patientId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get();

    const prescriptions = await Promise.all(
      prescriptionsSnap.docs.map(async (doc) => {
        const p = doc.data();
        
        // Fetch hospital name
        let hospitalName = 'Unknown Hospital';
        if (p.hospitalId) {
          const hospitalDoc = await adminDb.collection('hospitals').doc(p.hospitalId).get();
          hospitalName = hospitalDoc.exists ? hospitalDoc.data()?.name : hospitalName;
        }

        const medication = p.medication || {};
        const dosage = p.dosage || {};
        const duration = p.duration || {};

        return {
          id: doc.id,
          prescriptionId: doc.id, // Important for scheduler import
          medication: `${medication.name || 'Unknown'} ${medication.strength || ''}`.trim(),
          genericName: medication.genericName || '',
          form: medication.form || 'tablet',
          dosage: `${dosage.quantity || 1} ${dosage.unit || 'tablet'}`,
          frequency: dosage.frequency || 'once_daily',
          timing: dosage.timing || '',
          duration: duration.value ? `${duration.value} ${duration.unit}` : 'Ongoing',
          prescribedDate: p.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          prescribedBy: p.doctorName || 'Unknown Doctor',
          hospital: hospitalName,
          instructions: p.instructions || '',
          // Include raw data for scheduler import
          raw: {
            medication: medication.name || 'Unknown',
            dosage: `${dosage.quantity || 1} ${dosage.unit || 'tablet'}`,
            frequency: dosage.frequency || 'once_daily',
            timesPerDay: dosage.timesPerDay || 1,
            specificTimes: dosage.specificTimes || ['08:00'],
            timing: dosage.timing || '',
            duration: duration.value || 7,
            durationUnit: duration.unit || 'days',
            instructions: p.instructions || '',
          }
        };
      })
    );

    // 5. Fetch visit history with hospital names
    const visits = await Promise.all(
      visitsSnap.docs.map(async (doc) => {
        const visit = doc.data();
        let hospitalName = 'Unknown Hospital';
        if (visit.hospitalId) {
          const hospitalDoc = await adminDb.collection('hospitals').doc(visit.hospitalId).get();
          hospitalName = hospitalDoc.exists ? hospitalDoc.data()?.name : hospitalName;
        }

        return {
          id: doc.id,
          date: visit.checkInTime?.toDate?.()?.toISOString() || visit.createdAt?.toDate?.()?.toISOString(),
          hospital: hospitalName,
          department: visit.department || 'Unknown',
          purpose: visit.purpose || 'General consultation',
          status: visit.status,
        };
      })
    );

    // 6. Build complete personal info
    const personalInfo = {
      firstName: profile.firstName || userData.firstName || '',
      lastName: profile.lastName || userData.lastName || '',
      email: userData.email || '',
      phone: profile.phone || profile.phoneNumber || '',
      bloodType: profile.bloodType || passportData.personalInfo?.bloodType || null,
      dateOfBirth: profile.dateOfBirth || profile.dob || passportData.personalInfo?.dateOfBirth || null,
      gender: profile.gender || passportData.personalInfo?.gender || null,
      address: profile.address || null,
      emergencyContact: profile.emergencyContact || passportData.personalInfo?.emergencyContact || null,
    };

    return NextResponse.json({
      success: true,
      data: {
        isActive: passportData.isActive,
        activatedAt: passportData.activatedAt?.toDate?.()?.toISOString(),
        personalInfo,
        diagnoses: diagnoses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        prescriptions,
        visits: visits.slice(0, 10), // Last 10 visits
        allergies: passportData.allergies || [],
        vaccinations: passportData.vaccinations || [],
        visitHistory: passportData.visitHistory || [],
      },
    });
  } catch (err: any) {
    console.error('GET /api/patient/ehealth-passport error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
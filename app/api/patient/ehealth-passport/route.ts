// app/api/patient/ehealth-passport/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb,adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';


async function verifyPatient(session: string | undefined) {
  if (!session) return null;

  try {
    // Use adminAuth, NOT adminDb.auth()
    const decoded = await adminAuth.verifySessionCookie(session, true);

    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userData = userSnap.data();

    if (userSnap.exists && userData?.role === 'patient') {
      return decoded.uid;
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
    const patientId = await verifyPatient(sessionCookie);

    if (!patientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch patient's personal info
    const userDoc = await adminDb.collection('users').doc(patientId).get();
    const personalInfo = userDoc.data() || {};

    // 2. Fetch all visits (for diagnoses)
    const visitsSnap = await adminDb
      .collection('visits')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    const diagnoses = visitsSnap.docs
      .filter(doc => doc.data().diagnosis?.trim())
      .map(doc => {
        const d = doc.data();
        return {
          condition: d.diagnosis || 'Unknown condition',
          date: d.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          diagnosedBy: d.doctorName || 'Unknown Doctor',
          visitId: doc.id,
        };
      });

    // 3. Fetch active prescriptions
    const prescriptionsSnap = await adminDb
      .collection('prescriptions')
      .where('patientId', '==', patientId)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .get();

    const prescriptions = prescriptionsSnap.docs.map(doc => {
      const p = doc.data();
      const dosage = p.dosage;

      // Build human-readable dosage string
      const dosageParts = [];
      if (dosage.quantity) dosageParts.push(`${dosage.quantity} ${dosage.unit || ''}`);
      if (dosage.timing) dosageParts.push(dosage.timing.replace('_', ' '));
      if (dosage.frequency) {
        const freq = dosage.frequency === 'three_times_daily' ? '3 times daily'
                   : dosage.frequency.replace('_', ' ');
        dosageParts.push(freq);
      }

      const dosageStr = dosageParts.join(', ') || 'As directed';

      // Duration string
      const duration = p.duration;
      const durationStr = duration?.value
        ? `${duration.value} ${duration.unit}`
        : 'Unknown duration';

      return {
        id: doc.id,
        medication: `${p.medication?.name || p.medication?.genericName} ${p.medication?.strength || ''}`.trim(),
        dosage: dosageStr,
        frequency: dosage.frequency || '',
        duration: durationStr,
        prescribedDate: p.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        prescribedBy: p.doctorName || 'Unknown Doctor',
        instructions: p.instructions || '',
        raw: p, // optional: keep raw data if you want more control on frontend
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        personalInfo: {
          firstName: personalInfo.firstName || '',
          lastName: personalInfo.lastName || '',
          bloodType: personalInfo.bloodType || null,
          // add more fields as needed
        },
        diagnoses,
        prescriptions,
      },
    });
  } catch (err: any) {
    console.error('GET /api/patient/ehealth-passport', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
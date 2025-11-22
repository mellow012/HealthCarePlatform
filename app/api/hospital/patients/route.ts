// app/api/hospital/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { requireHospitalUser } from '@/lib/utils/require-hospital-user';

export async function GET(req: NextRequest) {
  const auth = await requireHospitalUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // Get all patients linked to this hospital via visits
    const visitsSnap = await adminDb
      .collection('visits')
      .where('hospitalId', '==', auth.hospitalId)
      .get();

    const patientIds = new Set<string>();
    const patientData: any = {};

    // Collect all unique patient UIDs from visits
    visitsSnap.forEach(doc => {
      const data = doc.data();
      if (data.patientId) {
        patientIds.add(data.patientId);
      }
    });

    // Fetch actual patient documents
    if (patientIds.size === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const patientsSnap = await adminDb
      .collection('patients')
      .where('__name__', 'in', Array.from(patientIds))
      .get();

    // Also get the most recent visit for lastVisit
    const now = new Date();
    const patientsList = patientsSnap.docs.map(doc => {
      const p = doc.data();
      const userId = doc.id;

      // Find latest visit for this patient
      let lastVisit: string | null = null;
      visitsSnap.forEach(v => {
        const vd = v.data();
        if (vd.patientId === userId) {
          const visitDate = vd.createdAt?.toDate() || new Date(vd.checkInTime || 0);
          if (!lastVisit || visitDate > new Date(lastVisit)) {
            lastVisit = visitDate.toISOString();
          }
        }
      });

      return {
        id: userId,
        firstName: p.personalInfo?.firstName || 'Unknown',
        lastName: p.personalInfo?.lastName || 'Patient',
        email: p.personalInfo?.email || '—',
        phone: p.personalInfo?.phone || '',
        dateOfBirth: p.personalInfo?.dateOfBirth || '',
        lastVisit,
      };
    });

    return NextResponse.json({ success: true, data: patientsList });
  } catch (error: any) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to load patients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireHospitalUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { firstName, lastName, email, phone, dateOfBirth } = body;

  if (!firstName || !lastName || !email || !dateOfBirth) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    // Create Firebase Auth user (optional, or just create patient doc)
    let userRecord;
    try {
      userRecord = await import('@/lib/firebase/admin').then(m => m.adminAuth.createUser({ email }));
    } catch (e) {
      // User might already exist — that's fine
    }

    const uid = userRecord?.uid || `manual_${Date.now()}`;

    // Create patient document
    await adminDb.collection('patients').doc(uid).set({
      userId: uid,
      personalInfo: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        dateOfBirth,
      },
      emergencyContact: {},
      medicalHistory: {},
      createdAt: new Date(),
      createdByHospital: auth.hospitalId,
    });

    // Optional: create minimal user doc if not exists
    if (!userRecord) {
      await adminDb.collection('users').doc(uid).set({
        uid,
        email,
        role: 'patient',
        setupComplete: false,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Create patient error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create patient' }, { status: 500 });
  }
}
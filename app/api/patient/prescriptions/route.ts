// app/api/patient/prescriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuthWithUserData } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const user = await verifyAuthWithUserData(sessionCookie);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const importedOnly = searchParams.get('imported') === 'true';

    let query: FirebaseFirestore.Query = adminDb
      .collection('prescriptions')
      .where('patientId', '==', user.uid);

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    if (importedOnly) {
      query = query.where('importedToScheduler', '==', true);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const prescriptions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        medication: data.medication,
        dosage: data.dosage,
        duration: {
          ...data.duration,
          startDate: data.duration?.startDate?.toDate?.()?.toISOString(),
          endDate: data.duration?.endDate?.toDate?.()?.toISOString(),
        },
        instructions: data.instructions,
        status: data.status,
        importedToScheduler: data.importedToScheduler,
        doctorName: data.doctorName,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data: prescriptions });
  } catch (err: any) {
    console.error('GET /api/patient/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// PATCH - Mark prescription as imported to scheduler
export async function PATCH(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const user = await verifyAuthWithUserData(sessionCookie);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prescriptionId, importedToScheduler } = await req.json();

    if (!prescriptionId) {
      return NextResponse.json({ error: 'prescriptionId required' }, { status: 400 });
    }

    // Verify ownership
    const prescriptionDoc = await adminDb.collection('prescriptions').doc(prescriptionId).get();
    if (!prescriptionDoc.exists || prescriptionDoc.data()?.patientId !== user.uid) {
      return NextResponse.json({ error: 'Prescription not found' }, { status: 404 });
    }

    await adminDb.collection('prescriptions').doc(prescriptionId).update({
      importedToScheduler: importedToScheduler ?? true,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/patient/prescriptions error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
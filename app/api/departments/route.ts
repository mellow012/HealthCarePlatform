// app/api/hospital/departments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyHospitalStaff } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  try {
    // THIS IS THE ONLY LINE THAT MATTERS — USE YOUR OWN FUNCTION
    const user = await verifyHospitalStaff(req.cookies.get('session')?.value);

    if (!user || !user.hospitalId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await adminDb
      .collection('hospitalDepartments')
      .where('hospitalId', '==', user.hospitalId)
      .where('status', '==', 'active')
      .orderBy('name')
      .get();

    const departments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: departments });
  } catch (error: any) {
    console.error('Departments API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
// app/api/hospital/departments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  const decoded = await verifyAuth(sessionCookie);

  // Allow both admin and staff to READ departments
  if (
    !decoded ||
    !['hospital_admin', 'hospital_staff','receptionist'].includes(decoded.role as string) ||
    !decoded.hospitalId
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snapshot = await adminDb
    .collection('hospitalDepartments')
    .where('hospitalId', '==', decoded.hospitalId)
    .get();

  const departments = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  return NextResponse.json({ success: true, data: departments });
}

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  const decoded = await verifyAuth(sessionCookie);

  // Only hospital_admin can CREATE departments
  if (!decoded || decoded.role !== 'hospital_admin' || !decoded.hospitalId) {
    return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
  }

  const { name, description = '' } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
  }

  const ref = await adminDb.collection('hospitalDepartments').add({
    hospitalId: decoded.hospitalId,
    name: name.trim(),
    description: description.trim(),
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, id: ref.id });
}
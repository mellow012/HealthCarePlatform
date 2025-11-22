// app/api/hospital/departments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth'; // ← Your real function

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('session')?.value;
  const decoded = await verifyAuth(sessionCookie);

 const validRoles = ['hospital_admin', 'hospital_staff'];
if (!decoded || !validRoles.includes(decoded.role as string) || !decoded.hospitalId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

  const { name, description = '' } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Department name is required' }, { status: 400 });
  }

  const deptRef = adminDb.collection('hospitalDepartments').doc(params.id);
  const doc = await deptRef.get();

  if (!doc.exists || doc.data()?.hospitalId !== decoded.hospitalId) {
    return NextResponse.json({ error: 'Department not found or access denied' }, { status: 404 });
  }

  await deptRef.update({
    name: name.trim(),
    description,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
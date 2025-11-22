// app/api/hospital/departments/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionCookie = req.cookies.get('session')?.value;
  const decoded = await verifyAuth(sessionCookie);

 if (!decoded || 
    !['hospital_admin', 'hospital_staff'].includes(decoded.role as string) || 
    !decoded.hospitalId
) {
  return null;
}

  const { status } = await req.json();
  if (!['active', 'inactive'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  await adminDb.collection('hospitalDepartments').doc(params.id).update({
    status,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
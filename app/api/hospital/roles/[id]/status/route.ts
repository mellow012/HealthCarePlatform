import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const decodedToken = await verifyAuth(req.cookies.get('session')?.value);
  const validRoles = ['hospital_admin', 'hospital_staff'];
if (!decodedToken || !validRoles.includes(decodedToken.role as string) || !decodedToken.hospitalId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

  const hospitalId = decodedToken.hospitalId;
  const { status } = await req.json();
  const roleRef = adminDb.collection('hospitalRoles').doc(params.id);
  const snap = await roleRef.get();
  if (!snap.exists || snap.data()?.hospitalId !== hospitalId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await roleRef.update({
    status,
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ success: true });
}
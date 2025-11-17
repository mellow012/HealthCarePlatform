import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { hospitalId } = await verifySession(req);
  if (!hospitalId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  await adminDb.collection('hospitalRoles').doc(params.id).update({
    name,
    description: description || '',
    permissions: permissions || [],
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
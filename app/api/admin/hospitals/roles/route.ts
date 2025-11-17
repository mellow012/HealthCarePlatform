import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/auth'; // Your helper

export async function GET(req: Request) {
  const { hospitalId } = await verifySession(req);
  if (!hospitalId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('hospitalRoles').where('hospitalId', '==', hospitalId).get();
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ success: true, data });
}

export async function POST(req: Request) {
  const { hospitalId } = await verifySession(req);
  if (!hospitalId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description, permissions } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const ref = await adminDb.collection('hospitalRoles').add({
    hospitalId,
    name,
    description: description || '',
    permissions: permissions || [],
    status: 'active',
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true, id: ref.id });
}
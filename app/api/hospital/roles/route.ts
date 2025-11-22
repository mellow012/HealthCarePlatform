import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

// Helper to verify session and get hospitalId
async function getHospitalSession() {
  const sessionCookie = (await cookies()).get('session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.hospitalId ? decoded : null;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await getHospitalSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await adminDb
      .collection('hospitals')
      .doc(session.hospitalId)
      .collection('roles')
      .orderBy('createdAt', 'desc')
      .get();

    const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getHospitalSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const roleData = {
      ...data,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const ref = await adminDb
      .collection('hospitals')
      .doc(session.hospitalId)
      .collection('roles')
      .add(roleData);

    return NextResponse.json({ success: true, data: { id: ref.id, ...roleData } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create role' }, { status: 500 });
  }
}
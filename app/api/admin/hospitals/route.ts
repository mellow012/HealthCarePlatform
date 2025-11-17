// app/api/super-admin/hospitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

async function verifySuperAdmin(session: string): Promise<string | null> {
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const snap = await adminDb.collection('users').doc(decoded.uid).get();
    if (snap.exists && snap.data()?.role === 'super_admin') return decoded.uid;
    return null;
  } catch {
    return null;
  }
}

// GET - Fetch all hospitals
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb.collection('hospitals').orderBy('createdAt', 'desc').get();
    
    const hospitals = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, data: hospitals });
  } catch (err: any) {
    console.error('GET /api/admin/hospitals', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new hospital (without admin user)
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, phone, address } = body;

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Create hospital document
    const hospitalRef = adminDb.collection('hospitals').doc();
    await hospitalRef.set({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      address: address || null,
      status: 'pending',
      setupCompleted: false,
      adminUserId: null, // No admin assigned yet
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: superUid,
    });

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'CREATE_HOSPITAL',
      resourceType: 'hospital',
      resourceId: hospitalRef.id,
      metadata: { name, email },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Hospital created successfully',
      hospitalId: hospitalRef.id,
    });
  } catch (err: any) {
    console.error('POST /api/admin/hospitals', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
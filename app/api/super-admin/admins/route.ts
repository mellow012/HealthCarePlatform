// app/api/super-admin/admins/route.ts
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

// GET - Fetch all admins (both hospital_admin and super_admin)
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

    // Get all users with admin roles
    const snapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['hospital_admin', 'super_admin'])
      .orderBy('createdAt', 'desc')
      .get();

    const admins = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ success: true, data: admins });
  } catch (err: any) {
    console.error('GET /api/super-admin/admins', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new super admin
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
    const { firstName, lastName, email, password } = body;

    // Validation
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already exists
    try {
      await adminAuth.getUserByEmail(trimmedEmail);
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    } catch (e: any) {
      if (e.code !== 'auth/user-not-found') throw e;
    }

    // Create auth user with password
    const userRecord = await adminAuth.createUser({
      email: trimmedEmail,
      password: password,
      emailVerified: true, // Super admins are pre-verified
    });

    // Set custom claims
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'super_admin',
    });

    // Create Firestore user document
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: trimmedEmail,
      role: 'super_admin',
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      setupComplete: true,
      requirePasswordReset: false,
      isActive: true,
      createdAt: new Date(),
      createdBy: superUid,
    });

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'CREATE_SUPER_ADMIN',
      resourceType: 'user',
      resourceId: userRecord.uid,
      metadata: { email: trimmedEmail, firstName, lastName },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully',
      uid: userRecord.uid,
    });
  } catch (err: any) {
    console.error('POST /api/super-admin/admins', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

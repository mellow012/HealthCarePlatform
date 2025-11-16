// app/api/admin/hospital-admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { sendInvitationEmail } from '@/lib/email-services';   // <-- same file you already have
import { FieldValue } from 'firebase-admin/firestore';

interface CreateAdminBody {
  firstName: string;
  lastName: string;
  email: string;
}

/* -------------------------------------------------
   Helper – verify the caller is a super_admin
   ------------------------------------------------- */
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

/* -------------------------------------------------
   POST – create hospital + admin + send email
   ------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { firstName, lastName, email }: CreateAdminBody = await req.json();

    // ---------- 1. basic validation ----------
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim())
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });

    const trimmedEmail = email.trim().toLowerCase();

    // ---------- 2. check if email already exists ----------
    try { await adminAuth.getUserByEmail(trimmedEmail); }
    catch (e: any) { if (e.code !== 'auth/user-not-found') throw e; }
    // if we get here the user does NOT exist → continue

    // ---------- 3. create hospital doc ----------
    const hospitalRef = adminDb.collection('hospitals').doc();
    const hospitalId = hospitalRef.id;

    // ---------- 4. create auth user (no password) ----------
    const userRecord = await adminAuth.createUser({
      email: trimmedEmail,
      emailVerified: false,
    });

    // ---------- 5. custom claims ----------
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'hospital_admin',
      hospitalId,
    });

    // ---------- 6. Firestore batch ----------
    const batch = adminDb.batch();

    // hospital doc
    batch.set(hospitalRef, {
      name: `${firstName} ${lastName}`.trim(),
      email: trimmedEmail,
      adminUserId: userRecord.uid,
      status: 'pending',
      setupCompleted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // users doc
    const userRef = adminDb.collection('users').doc(userRecord.uid);
    batch.set(userRef, {
      uid: userRecord.uid,
      email: trimmedEmail,
      role: 'hospital_admin',
      hospitalId,
      profile: { firstName: firstName.trim(), lastName: lastName.trim() },
      setupComplete: false,
      requirePasswordReset: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: superUid,
    });

    await batch.commit();

    // ---------- 7. password-reset link ----------
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const continueUrl = new URL('/hospital/setup', base);
    continueUrl.searchParams.set('hospitalId', hospitalId);

    const resetLink = await adminAuth.generatePasswordResetLink(
      trimmedEmail,
      { url: continueUrl.toString(), handleCodeInApp: true }
    );

    // ---------- 8. send email ----------
    try {
      await sendInvitationEmail(
        trimmedEmail,
        `${firstName} ${lastName}`.trim(),
        resetLink,
        hospitalId
      );
    } catch (emailErr) {
      console.error('Email failed → still return success', emailErr);
      return NextResponse.json({
        success: true,
        message: `Hospital created but email failed. Contact ${trimmedEmail} manually.`,
        uid: userRecord.uid,
        hospitalId,
      });
    }

    // ---------- 9. audit log ----------
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'CREATE_HOSPITAL_ADMIN',
      resourceType: 'user',
      resourceId: userRecord.uid,
      metadata: { email: trimmedEmail, firstName, lastName },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: `Hospital admin created – invitation sent to ${trimmedEmail}`,
      uid: userRecord.uid,
      hospitalId,
      // keep link for local dev only
      ...(process.env.NODE_ENV === 'development' ? { resetLink } : {}),
    });
  } catch (err: any) {
    console.error('POST /api/admin/hospital-admins', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   GET – list all hospital admins (unchanged)
   ------------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const snap = await adminDb
      .collection('users')
      .where('role', '==', 'hospital_admin')
      .get();

    const admins = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ success: true, data: admins });
  } catch (err: any) {
    console.error('GET /api/admin/hospital-admins', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
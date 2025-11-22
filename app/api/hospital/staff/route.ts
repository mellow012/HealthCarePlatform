import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';
// Removed: import nodemailer from 'nodemailer';
// Removed: const transporter = ...

// Import the dedicated email utility function
import { sendStaffInvitationEmail } from '@/lib/email-services';


// GET: List Staff
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    if (!decoded || !decoded.hospitalId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const snapshot = await adminDb
      .collection('users')
      .where('hospitalId', '==', decoded.hospitalId)
      .get();

    const staff = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        // Filter out patients on the server side
        if (data.role === 'patient') return null;

        // Safe Date Conversion
        let createdDate = null;
        if (data.createdAt?.toDate) {
            createdDate = data.createdAt.toDate().toISOString();
        } else if (data.createdAt) {
            createdDate = new Date(data.createdAt).toISOString();
        }

        return {
          uid: doc.id,
          email: data.email || '',
          role: data.role || '—',
          department: data.department || null,
          profile: data.profile || { firstName: '', lastName: '' },
          status: data.status || 'active',
          setupComplete: data.setupComplete || false,
          createdAt: createdDate,
        };
      })
      .filter(Boolean);

    // Sort manually
    staff.sort((a: any, b: any) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

    return NextResponse.json({ success: true, data: staff });
  } catch (err: any) {
    console.error('GET /api/hospital/staff error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Invite Staff
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const decoded = await verifyAuth(sessionCookie);

    // Ensure only hospital_admin can invite staff
    if (!decoded || decoded.role !== 'hospital_admin' || !decoded.hospitalId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role, department } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. Check if user exists in Auth
    let uid;
    try {
        const existingUser = await adminAuth.getUserByEmail(trimmedEmail);
        uid = existingUser.uid;
    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            // Create new user
            const newUser = await adminAuth.createUser({
                email: trimmedEmail,
                emailVerified: false,
            });
            uid = newUser.uid;
        } else {
            throw e;
        }
    }

    // 2. Set custom claims so the new user has the correct permissions immediately
    await adminAuth.setCustomUserClaims(uid, {
      role,
      hospitalId: decoded.hospitalId,
      department: department || null
    });

    // 3. Create/Update User Doc in Firestore
    await adminDb.collection('users').doc(uid).set({
      uid,
      email: trimmedEmail,
      role,
      hospitalId: decoded.hospitalId,
      department: department || null,
      profile: { firstName: '', lastName: '' },
      setupComplete: false,
      status: 'active',
      createdAt: new Date(),
      invitedBy: decoded.uid
    }, { merge: true });

    // 4. Generate Password Reset Link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const continueUrl = `${baseUrl}/hospital/staff/setup?uid=${uid}&mode=resetPassword`;

    const link = await adminAuth.generatePasswordResetLink(trimmedEmail, {
      url: continueUrl,
    });

    // 5. Send Email using the imported utility function
    await sendStaffInvitationEmail(trimmedEmail, role, link);

    return NextResponse.json({ success: true, message: 'Invitation sent' });
  } catch (err: any) {
    console.error('POST /api/hospital/staff error:', err);
    return NextResponse.json({ error: err.message || 'Failed to invite staff' }, { status: 500 });
  }
}
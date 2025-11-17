// app/api/super-admin/admins/[id]/route.ts
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

// GET - Fetch single admin
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const doc = await adminDb.collection('users').doc(params.id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
      },
    });
  } catch (err: any) {
    console.error('GET /api/super-admin/admins/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { isActive, profile, role } = body;

    const userRef = adminDb.collection('users').doc(params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      
      // Also disable/enable auth account
      await adminAuth.updateUser(params.id, {
        disabled: !isActive,
      });
    }

    if (profile !== undefined) {
      updateData.profile = profile;
    }

    if (role !== undefined) {
      updateData.role = role;
      // Update custom claims
      await adminAuth.setCustomUserClaims(params.id, { role });
    }

    await userRef.update(updateData);

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'UPDATE_ADMIN',
      resourceType: 'user',
      resourceId: params.id,
      metadata: { updates: Object.keys(updateData) },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
    });
  } catch (err: any) {
    console.error('PATCH /api/super-admin/admins/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete admin
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const superUid = await verifySuperAdmin(sessionCookie);
    if (!superUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === superUid) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const userData = userDoc.data();

    // Delete from Firebase Auth
    await adminAuth.deleteUser(params.id);

    // Delete from Firestore
    await userRef.delete();

    // If hospital admin, update hospital document
    if (userData?.role === 'hospital_admin' && userData?.hospitalId) {
      await adminDb.collection('hospitals').doc(userData.hospitalId).update({
        adminUserId: null,
        status: 'pending',
        updatedAt: new Date(),
      });
    }

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'DELETE_ADMIN',
      resourceType: 'user',
      resourceId: params.id,
      metadata: { 
        email: userData?.email,
        role: userData?.role,
        name: `${userData?.profile?.firstName} ${userData?.profile?.lastName}`,
      },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (err: any) {
    console.error('DELETE /api/super-admin/admins/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
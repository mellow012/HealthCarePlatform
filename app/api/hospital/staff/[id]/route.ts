import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

async function verifyHospitalAdmin(session: string) {
  try {
    const decoded = await adminAuth.verifySessionCookie(session, true);
    const snap = await adminDb.collection('users').doc(decoded.uid).get();
    const data = snap.data();
    
    if (snap.exists && data?.role === 'hospital_admin' && decoded.hospitalId) {
      return { uid: decoded.uid, hospitalId: decoded.hospitalId };
    }
    return null;
  } catch {
    return null;
  }
}

// PATCH - Update staff member
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await verifyHospitalAdmin(sessionCookie);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { isActive, department, profile } = body;

    const userRef = adminDb.collection('users').doc(params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    // Verify staff belongs to this hospital
    if (userData?.hospitalId !== admin.hospitalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
      await adminAuth.updateUser(params.id, { disabled: !isActive });
    }

    if (department !== undefined) {
      updateData.department = department;
      // Update custom claims
      const currentClaims = (await adminAuth.getUser(params.id)).customClaims || {};
      await adminAuth.setCustomUserClaims(params.id, { ...currentClaims, department });
    }

    if (profile !== undefined) {
      updateData.profile = profile;
    }

    await userRef.update(updateData);

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: admin.uid,
      action: 'UPDATE_STAFF_MEMBER',
      resourceType: 'user',
      resourceId: params.id,
      metadata: { updates: Object.keys(updateData) },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
    });
  } catch (err: any) {
    console.error('PATCH /api/hospital/staff/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove staff member
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await verifyHospitalAdmin(sessionCookie);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userRef = adminDb.collection('users').doc(params.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    // Verify staff belongs to this hospital
    if (userData?.hospitalId !== admin.hospitalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from Firebase Auth
    await adminAuth.deleteUser(params.id);

    // Delete from Firestore
    await userRef.delete();

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: admin.uid,
      action: 'DELETE_STAFF_MEMBER',
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
      message: 'Staff member deleted successfully',
    });
  } catch (err: any) {
    console.error('DELETE /api/hospital/staff/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
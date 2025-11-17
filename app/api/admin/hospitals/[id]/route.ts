
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

// GET - Fetch single hospital
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

    const doc = await adminDb.collection('hospitals').doc(params.id).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
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
    console.error('GET /api/admin/hospitals/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update hospital
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
    const { name, email, phone, address, status } = body;

    const hospitalRef = adminDb.collection('hospitals').doc(params.id);
    const hospitalDoc = await hospitalRef.get();

    if (!hospitalDoc.exists) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;

    await hospitalRef.update(updateData);

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'UPDATE_HOSPITAL',
      resourceType: 'hospital',
      resourceId: params.id,
      metadata: { updates: Object.keys(updateData) },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Hospital updated successfully',
    });
  } catch (err: any) {
    console.error('PATCH /api/admin/hospitals/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete hospital
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

    const hospitalRef = adminDb.collection('hospitals').doc(params.id);
    const hospitalDoc = await hospitalRef.get();

    if (!hospitalDoc.exists) {
      return NextResponse.json({ error: 'Hospital not found' }, { status: 404 });
    }

    const hospitalData = hospitalDoc.data();

    // Check if hospital has associated admin
    if (hospitalData?.adminUserId) {
      // Optional: You might want to prevent deletion or handle admin cleanup
      // For now, we'll just warn in logs
      console.warn(`Deleting hospital ${params.id} that has admin ${hospitalData.adminUserId}`);
    }

    await hospitalRef.delete();

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: superUid,
      action: 'DELETE_HOSPITAL',
      resourceType: 'hospital',
      resourceId: params.id,
      metadata: { name: hospitalData?.name, email: hospitalData?.email },
      timestamp: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Hospital deleted successfully',
    });
  } catch (err: any) {
    console.error('DELETE /api/admin/hospitals/[id]', err);
    return NextResponse.json(
      { error: err.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
// app/api/patient/ehealth-passport/route.ts
import { NextResponse, NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to verify session cookie
async function verifySession(token: string | undefined) {
  if (!token) return null;
  try {
    return await adminAuth.verifySessionCookie(token, true); // true = check revoked
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

// ============================================== GET - Fetch Passport
export async function GET(req: NextRequest) {
  try {
    const token = ( await cookies()).get('session')?.value;
    const decodedToken = await verifySession(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'patient') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get E-Health Passport
    const passportDoc = await adminDb.collection('eHealthPassports').doc(decodedToken.uid).get();

    if (!passportDoc.exists) {
      return NextResponse.json({
        success: true,
        message: 'E-Health Passport not activated yet',
        data: {
          isActive: false,
          message: 'Your E-Health Passport will be activated on your first hospital visit',
          consent: { dataSharing: false, emergencyAccess: false }, // Defaults
        },
      });
    }

    const passportData = passportDoc.data();

    // Get hospital names for visit history (only if hospitals array exists)
    const hospitalIds = Array.isArray(passportData?.visitHistory?.hospitals) ? passportData.visitHistory.hospitals : [];
    const hospitals = await Promise.all(
      hospitalIds.map(async (hospitalId: string) => {
        const hospitalDoc = await adminDb.collection('hospitals').doc(hospitalId).get();
        const hospitalData = hospitalDoc.data() || {};
        return {
          id: hospitalId,
          name: hospitalData.name || 'Unknown Hospital',
          address: hospitalData.address || {},
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...passportData,
        visitHistory: {
          ...passportData.visitHistory,
          hospitalsDetails: hospitals,
        },
        activatedAt: passportData?.activatedAt?.toDate().toISOString(),
        createdAt: passportData?.createdAt?.toDate().toISOString(),
        updatedAt: passportData?.updatedAt?.toDate().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching E-Health Passport:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch E-Health Passport' },
      { status: 500 }
    );
  }
}

// ============================================== PUT - Update Passport
export async function PUT(req: NextRequest) {
  try {
    const token = (await cookies()).get('session')?.value;
    const decodedToken = await verifySession(token);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify role
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'patient') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = await req.json();

    // Validate updates
    if (typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Validate that passport exists
    const passportRef = adminDb.collection('eHealthPassports').doc(decodedToken.uid);
    const passportDoc = await passportRef.get();

    if (!passportDoc.exists) {
      return NextResponse.json(
        { error: 'E-Health Passport not activated yet' },
        { status: 404 }
      );
    }

    const existingData = passportDoc.data() || {};
    const currentVersion = existingData.version || 1;

    // Update passport (merge to avoid overwrites)
    await passportRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
      version: currentVersion + 1,
    });

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: decodedToken.uid,
      action: 'EHEALTH_PASSPORT_UPDATED',
      resourceType: 'eHealthPassport',
      resourceId: decodedToken.uid,
      metadata: { 
        updatedFields: Object.keys(updates),
        previousVersion: currentVersion,
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'E-Health Passport updated successfully',
      data: { version: currentVersion + 1 },
    });
  } catch (error: any) {
    console.error('Error updating E-Health Passport:', error);
    if (error.code === 'permission-denied') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update E-Health Passport' },
      { status: 500 }
    );
  }
}

// Optional: PATCH for partial updates
export async function PATCH(req: NextRequest) {
  return PUT(req); // Reuse PUT logic
}
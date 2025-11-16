// app/api/profile/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const token = (await cookies()).get('session')?.value;
    const decodedToken = await verifyAuth(token);
    
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { firstName, lastName, phone, dateOfBirth, gender, address } = await req.json();

    // Validate required fields (for updates, still require basics)
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    const uid = decodedToken.uid;

    // Fetch existing user doc (for timestamps, no reject here)
    const userRef = adminDb.collection('users').doc(uid);
    const existingUserSnap = await userRef.get();
    if (!existingUserSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const existingUserData = existingUserSnap.data() || {};
    const createdAt = existingUserData.createdAt || FieldValue.serverTimestamp();

    // Update user document (core profile)
    const userData = {
      uid,
      email: decodedToken.email,
      role: existingUserData.role || 'patient',
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || '',
      },
      setupComplete: true, // Ensure complete
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.set(userData, { merge: true });

    // Update patient document (full details) – always merge, no existence check
    const patientRef = adminDb.collection('patients').doc(uid);
    await patientRef.set({
      userId: uid,
      personalInfo: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth || null,
        gender: gender || '',
        phone: phone?.trim() || '',
        address: address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
        },
      },
      // Preserve other fields if they exist (emergency, medical, etc.)
      ...(existingUserData.emergencyContact ? { emergencyContact: existingUserData.emergencyContact } : {}),
      ...(existingUserData.medicalHistory ? { medicalHistory: existingUserData.medicalHistory } : {
        medicalHistory: {
          bloodType: '',
          allergies: [],
          chronicConditions: [],
          currentMedications: [],
        },
      }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true }); // Merge to avoid overwrites

    // Audit log
    await adminDb.collection('auditLogs').add({
      userId: uid,
      action: 'PROFILE_UPDATED',
      resourceType: 'user',
      resourceId: uid,
      metadata: { firstName: firstName.trim(), lastName: lastName.trim() },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: { uid, firstName: userData.profile.firstName, lastName: userData.profile.lastName },
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    const status = error.code?.startsWith('auth/') ? 401 : 500;
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status }
    );
  }
}
// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';


export async function GET(req: NextRequest) {
  try {
    const session =(await cookies()).get('session')?.value;
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const uid = decoded.uid;

    // Fetch users doc (basic profile)
    const userSnap = await adminDb.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    const userData = userSnap.data();

    // Fetch patients doc (full details)
    const patientSnap = await adminDb.collection('patients').doc(uid).get();
    const patientData = patientSnap.exists ? patientSnap.data() : null;

    // Merge into ProfileData shape
    const profile = {
      firstName: (userData.profile?.firstName || patientData?.personalInfo?.firstName || '').trim(),
      lastName: (userData.profile?.lastName || patientData?.personalInfo?.lastName || '').trim(),
      phone: (userData.profile?.phone || patientData?.personalInfo?.phone || '').trim(),
      dateOfBirth: patientData?.personalInfo?.dateOfBirth || null,
      gender: patientData?.personalInfo?.gender || '',
      address: patientData?.personalInfo?.address || {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
    };

    // Check if "complete" (has meaningful data)
    const hasProfile = profile.firstName && profile.lastName; // Or whatever threshold you want

    return NextResponse.json({
      success: true,
      data: profile,
      hasProfile, // For frontend logic
      setupComplete: !!userData.setupComplete,
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
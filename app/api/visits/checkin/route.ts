import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers'; // For session cookie
import { FieldValue, DocumentData } from 'firebase-admin/firestore';

/**
 * @route POST /api/visits/check-in
 * @description Handles patient check-in by hospital staff. Verifies staff, finds the patient,
 * creates a new visit, grants initial access, and activates the E-Health Passport 
 * if it's the patient's first time.
 * @access Private (Staff only)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication and Authorization Check - FIXED: Use session cookie
    const token = ( await cookies()).get('session')?.value;
    if (!token) {
      console.log('No session token for check-in');
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(token, true); // true = check revoked
    if (!decodedToken) {
      console.log('Session verification failed for check-in');
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 });
    }

    // 2. Staff/Hospital Configuration Check
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'hospital_admin' || !userData.hospitalId) {
      console.log('Invalid role or hospitalId for check-in:', { role: userData?.role, hospitalId: userData?.hospitalId });
      return NextResponse.json(
        { error: 'Hospital ID not configured for staff member' },
        { status: 403 }
      );
    }
    const staffHospitalId = userData.hospitalId;

    // 3. Parse Request Body
    const { patientEmail, purpose, department } = await req.json();

    if (!patientEmail || !purpose || !department) {
      return NextResponse.json(
        { error: 'Missing required fields: patientEmail, purpose, and department' },
        { status: 400 }
      );
    }

    // 4. Find Patient by Email
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', patientEmail.toLowerCase())
      .where('role', '==', 'patient')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Patient not found. Please ensure the patient is registered.' },
        { status: 404 }
      );
    }

    const patientDoc = usersSnapshot.docs[0];
    const patientId = patientDoc.id;
    
    // 5. Check if patient already checked in at this hospital
    const activeVisitsSnapshot = await adminDb
      .collection('visits')
      .where('patientId', '==', patientId)
      .where('hospitalId', '==', staffHospitalId)
      .where('status', '==', 'checked_in')
      .get();

    if (!activeVisitsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Patient is already checked in at this hospital' },
        { status: 400 }
      );
    }
    
    // 6. Check E-Health Passport status
    const passportDoc = await adminDb.collection('eHealthPassports').doc(patientId).get();
    const passportData = passportDoc.data();
    const isFirstCheckIn = !passportDoc.exists || !passportData?.isActive;

    // 7. Initialize E-Health Passport if necessary
    if (isFirstCheckIn) {
      await initializeEHealthPassport(patientId, staffHospitalId);
    }

    // 8. Create new Visit Record
    const visitId = `visit_${patientId}_${staffHospitalId}_${Date.now()}`;
    const checkInTime = FieldValue.serverTimestamp();

    const visitData = {
      id: visitId,
      patientId,
      hospitalId: staffHospitalId,
      checkInTime,
      checkOutTime: null,
      status: 'checked_in',
      purpose,
      department,
      isFirstVisit: isFirstCheckIn,
      metadata: {
        checkInBy: decodedToken.uid,
        checkInMethod: 'staff',
        eHealthPassportActivated: isFirstCheckIn,
      },
      createdAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('visits').doc(visitId).set(visitData);

    // 9. Create Access Grant for the hospital
    const accessGrantId = `grant_${patientId}_${staffHospitalId}_${Date.now()}`;
    await adminDb.collection('accessGrants').doc(accessGrantId).set({
      patientId,
      hospitalId: staffHospitalId,
      visitId,
      grantedAt: checkInTime,
      revokedAt: null,
      permissions: ['read', 'write'], // Default permissions for active visit
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });

    // 10. Update E-Health Passport visit history
    await updateVisitHistory(patientId, staffHospitalId);

    // 11. Audit log
    await adminDb.collection('auditLogs').add({
      userId: decodedToken.uid,
      action: isFirstCheckIn ? 'EHEALTH_PASSPORT_ACTIVATED' : 'PATIENT_CHECK_IN',
      resourceType: 'visit',
      resourceId: visitId,
      metadata: { 
        patientId, 
        hospitalId: staffHospitalId, 
        purpose, 
        department,
        firstCheckIn: isFirstCheckIn 
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    // 12. Success Response
    return NextResponse.json({
      success: true,
      message: isFirstCheckIn 
        ? 'Patient checked in successfully and E-Health Passport activated!'
        : 'Patient checked in successfully',
      data: {
        ...visitData,
        checkInTime: new Date().toISOString(), // Client-side approx for response
        eHealthPassportActivated: isFirstCheckIn,
      },
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check in patient due to a server error.' },
      { status: 500 }
    );
  }
}

// Helper: Initialize E-Health Passport with basic patient data
async function initializeEHealthPassport(patientId: string, hospitalId: string) {
  try {
    // Get patient data from 'users' (auth/email) and 'patients' (profile) collections
    const patientUserDoc = await adminDb.collection('users').doc(patientId).get();
    const patientProfileDoc = await adminDb.collection('patients').doc(patientId).get();
    
    const userData: DocumentData | undefined = patientUserDoc.data();
    const profileData: DocumentData | undefined = patientProfileDoc.data();

    // Utility function to safely access nested data
    const getNestedValue = (path: string) => {
      const keys = path.split('.');
      let value = profileData; // Prefer profile data
      
      for (const key of keys) {
        if (value && value[key] !== undefined) {
          value = value[key];
        } else {
          // Fallback to user data if not found in profile data
          const userValue = userData;
          const userKeys = path.split('.');
          let userCurrent = userValue;
          let foundInUser = true;

          for (const userKey of userKeys) {
            if (userCurrent && userCurrent[userKey] !== undefined) {
              userCurrent = userCurrent[userKey];
            } else {
              foundInUser = false;
              break;
            }
          }
          if (foundInUser) return userCurrent;
          return undefined; 
        }
      }
      return value;
    };

    const passportData = {
      patientId,
      isActive: true,
      activatedAt: FieldValue.serverTimestamp(),
      activatedBy: hospitalId, // Record which hospital initiated the activation
      
      personalInfo: {
        firstName: getNestedValue('personalInfo.firstName') || getNestedValue('profile.firstName') || '',
        lastName: getNestedValue('personalInfo.lastName') || getNestedValue('profile.lastName') || '',
        dateOfBirth: getNestedValue('personalInfo.dateOfBirth') || null,
        gender: getNestedValue('personalInfo.gender') || '',
        bloodType: '', // To be filled in later
        phone: getNestedValue('personalInfo.phone') || getNestedValue('profile.phone') || '',
        email: userData?.email || '',
      },
      
      addresses: {
        primary: getNestedValue('personalInfo.address') || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Malawi', // Default
          type: 'home',
        },
      },
      
      emergencyContacts: getNestedValue('emergencyContact.name') ? [{
        id: `ec_${Date.now()}`,
        name: getNestedValue('emergencyContact.name'),
        relationship: getNestedValue('emergencyContact.relationship') || '',
        phone: getNestedValue('emergencyContact.phone') || '',
        isPrimary: true,
      }] : [],
      
      medicalHistory: {
        allergies: [],
        chronicConditions: [],
        surgeries: [],
        familyHistory: [],
        immunizations: [],
        currentMedications: [],
      },
      
      visitHistory: {
        totalVisits: 0,
        hospitals: [],
        lastVisit: null,
      },
      
      consent: {
        dataSharing: true, // Default to true on activation
        researchParticipation: false,
        emergencyAccess: true,
      },
      
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      version: 1,
    };

    await adminDb.collection('eHealthPassports').doc(patientId).set(passportData);
    
    console.log('E-Health Passport initialized for patient:', patientId);
  } catch (error) {
    console.error('Error initializing E-Health Passport:', error);
    // Propagate error up to the main handler's try/catch
    throw new Error('Failed to initialize E-Health Passport.'); 
  }
}

// Helper: Update visit history in the E-Health Passport
async function updateVisitHistory(patientId: string, hospitalId: string) {
  try {
    const passportRef = adminDb.collection('eHealthPassports').doc(patientId);
    const passportDoc = await passportRef.get();
    
    if (passportDoc.exists) {
      const data = passportDoc.data();
      // Ensure we treat the hospitals array safely
      const hospitals: string[] = Array.isArray(data?.visitHistory?.hospitals) 
        ? data!.visitHistory.hospitals 
        : [];
      
      // Add hospital if not already in list
      if (!hospitals.includes(hospitalId)) {
        hospitals.push(hospitalId);
      }
      
      await passportRef.update({
        'visitHistory.totalVisits': (data?.visitHistory?.totalVisits || 0) + 1,
        'visitHistory.hospitals': hospitals,
        'visitHistory.lastVisit': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating visit history:', error);
    // Note: This helper does not throw, as visit creation is the primary goal.
  }
}
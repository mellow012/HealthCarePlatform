// lib/utils/require-hospital-user.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/utils/server-auth';

export async function requireHospitalUser(req: NextRequest): Promise<any> {
  const session = req.cookies.get('session')?.value;
  const decoded = await verifyAuth(session);

  // If no session or invalid
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized – no session' }, { status: 401 });
  }

  // Define all roles that belong to a hospital
  const HOSPITAL_ROLES = [
    'hospital_admin',
    'hospital_staff',
    'receptionist',   // ← ADDED
    'doctor',         // ← ADDED (for future)
  ] as const;

  const role = decoded.role as string;

  // Check: valid role + has hospitalId
  if (!HOSPITAL_ROLES.includes(role as any) || !decoded.hospitalId) {
    console.log('Access denied:', { uid: decoded.uid, role, hasHospitalId: !!decoded.hospitalId });
    return NextResponse.json({ error: 'Forbidden – insufficient permissions' }, { status: 403 });
  }

  // All good — return full user context
  return {
    uid: decoded.uid,
    role: decoded.role,
    hospitalId: decoded.hospitalId,
    email: decoded.email,
    // Add anything else you need from decoded claims
  };
}
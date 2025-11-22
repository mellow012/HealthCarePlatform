// lib/utils/hospital-auth.ts
import { DecodedIdToken } from 'firebase-admin/auth';

export function requireHospitalUser(decoded: DecodedIdToken | null) {
  if (
    !decoded ||
    !['hospital_admin', 'hospital_staff'].includes(decoded.role as string) ||
    !decoded.hospitalId
  ) {
    return { authorized: false };
  }
  return {
    authorized: true,
    hospitalId: decoded.hospitalId as string,
    role: decoded.role as 'hospital_admin' | 'hospital_staff',
    uid: decoded.uid,
  };
}
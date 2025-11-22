// app/api/patients/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAuth } from '@/lib/utils/server-auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = (await cookies()).get('session')?.value;
    const user = await verifyAuth(sessionCookie);

    if (!user || !['doctor', 'receptionist', 'hospital_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search by email or name
    const snapshot = await adminDb
      .collection('users')
      .where('role', '==', 'patient')
      .get();

    const patients = snapshot.docs
      .map(doc => ({
        id: doc.id,
        email: doc.data().email || '',
        profile: doc.data().profile || {},
      }))
      .filter(patient => {
        const email = patient.email.toLowerCase();
        const firstName = (patient.profile.firstName || '').toLowerCase();
        const lastName = (patient.profile.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        
        return email.includes(query) || 
               firstName.includes(query) || 
               lastName.includes(query) ||
               fullName.includes(query);
      })
      .slice(0, 10); // Limit to 10 results

    return NextResponse.json({ success: true, data: patients });
  } catch (err: any) {
    console.error('Search patients error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
// app/api/hospitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(req: NextRequest) {
  try {
    const { search = '' } = Object.fromEntries(req.nextUrl.searchParams);
    let query = adminDb.collection('hospitals').where('status', '==', 'active');

    if (search.trim()) {
      // Simple prefix search on name (for full-text, use Algolia later)
      const startAt = search.trim();
      const endAt = search.trim() + '\uf8ff';
      query = query.where('name', '>=', startAt).where('name', '<=', endAt);
    }

    const snapshot = await query.limit(20).get();
    const hospitals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      address: doc.data().address || {}, // Flatten if needed
    }));

    return NextResponse.json({ success: true, data: hospitals });
  } catch (error: any) {
    console.error('Hospitals fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const profileRef = adminDb.collection('emergencyProfiles').doc(params.userId);
    const doc = await profileRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      ...doc.data(),
    });
  } catch (error) {
    console.error('Error fetching emergency profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emergency profile' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json();
    const profileRef = adminDb.collection('emergencyProfiles').doc(params.userId);

    await profileRef.set({
      ...body,
      userId: params.userId,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving emergency profile:', error);
    return NextResponse.json(
      { error: 'Failed to save emergency profile' },
      { status: 500 }
    );
  }
}
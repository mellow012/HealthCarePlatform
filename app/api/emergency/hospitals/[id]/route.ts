// app/api/emergency/hospitals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const hospitalRef = adminDb.collection('hospitals').doc(params.id);
    
    await hospitalRef.update({
      ...body,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating hospital:', error);
    return NextResponse.json(
      { error: 'Failed to update hospital' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hospitalRef = adminDb.collection('hospitals').doc(params.id);
    await hospitalRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    return NextResponse.json(
      { error: 'Failed to delete hospital' },
      { status: 500 }
    );
  }
}
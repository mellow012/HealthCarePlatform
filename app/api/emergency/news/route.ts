// app/api/emergency/news/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const limitCount = parseInt(searchParams.get('limit') || '20');

    let query = adminDb.collection('healthNews')
      .orderBy('publishedAt', 'desc')
      .limit(limitCount);

    if (category && category !== 'All') {
      query = adminDb.collection('healthNews')
        .where('category', '==', category)
        .orderBy('publishedAt', 'desc')
        .limit(limitCount);
    }

    const snapshot = await query.get();
    const news = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching health news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health news' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newsRef = adminDb.collection('healthNews');
    const docRef = await newsRef.add({
      ...body,
      createdAt: new Date(),
      publishedAt: body.publishedAt || new Date(),
    });

    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error) {
    console.error('Error adding health news:', error);
    return NextResponse.json(
      { error: 'Failed to add health news' },
      { status: 500 }
    );
  }
}
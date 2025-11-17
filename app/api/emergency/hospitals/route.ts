// app/api/emergency/hospitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Helper function
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userLat = searchParams.get('lat');
    const userLng = searchParams.get('lng');

    const hospitalsRef = adminDb.collection('hospitals');
    const snapshot = await hospitalsRef.orderBy('createdAt', 'desc').get();

    const hospitals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate distances if user location provided
    if (userLat && userLng) {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);

      const hospitalsWithDistance = hospitals.map(hospital => {
        const distance = calculateDistance(
          lat,
          lng,
          hospital.location.latitude,
          hospital.location.longitude
        );
        const estimatedTime = Math.ceil(distance / 0.5);
        return {
          ...hospital,
          distance: parseFloat(distance.toFixed(1)),
          estimatedTime: `${estimatedTime} mins`
        };
      });

      hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
      return NextResponse.json(hospitalsWithDistance);
    }

    return NextResponse.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hospitals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const hospitalsRef = adminDb.collection('hospitals');
    const docRef = await hospitalsRef.add({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: docRef.id, success: true });
  } catch (error) {
    console.error('Error adding hospital:', error);
    return NextResponse.json(
      { error: 'Failed to add hospital' },
      { status: 500 }
    );
  }
}
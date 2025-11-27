import { NextRequest, NextResponse } from 'next/server';
import { getRoute } from '@/lib/routes-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const originLat = searchParams.get('origin_lat');
    const originLng = searchParams.get('origin_lng');
    const destLat = searchParams.get('dest_lat');
    const destLng = searchParams.get('dest_lng');

    if (!originLat || !originLng || !destLat || !destLng) {
      return NextResponse.json(
        { error: 'Origin and destination coordinates are required' },
        { status: 400 }
      );
    }

    const origin = {
      lat: parseFloat(originLat),
      lng: parseFloat(originLng),
    };

    const destination = {
      lat: parseFloat(destLat),
      lng: parseFloat(destLng),
    };

    const route = await getRoute(origin, destination);

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ route });
  } catch (error) {
    console.error('Error in routes route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch route' },
      { status: 500 }
    );
  }
}


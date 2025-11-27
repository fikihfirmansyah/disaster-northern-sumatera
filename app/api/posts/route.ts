import { NextRequest, NextResponse } from 'next/server';
import { getPostsWithAnalysis } from '@/lib/db';
import type { FilterOptions } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const filters: FilterOptions = {};
    
    const severity = searchParams.get('severity');
    if (severity) {
      filters.severity = severity.split(',') as any;
    }
    
    const disasterType = searchParams.get('disaster_type');
    if (disasterType) {
      filters.disaster_type = disasterType.split(',') as any;
    }
    
    const area = searchParams.get('area');
    if (area) {
      filters.area = area;
    }

    const posts = await getPostsWithAnalysis(filters);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error in posts route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


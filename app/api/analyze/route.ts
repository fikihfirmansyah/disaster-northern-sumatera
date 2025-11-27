import { NextRequest, NextResponse } from 'next/server';
import { analyzeDisasterPost } from '@/lib/genkit-flow';
import { extractLocationFromText, geocodeLocation } from '@/lib/geocoding';
import { extractLocationWithGemini } from '@/lib/gemini-location';
import type { AnalyzeRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { text, image_url, location_text } = body;

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const analysis = await analyzeDisasterPost(text);

    // Extract and geocode location if not provided
    // Try Gemini first if API key is available
    let location: string | null = location_text || null;
    
    if (!location && process.env.GEMINI_API_KEY) {
      location = await extractLocationWithGemini(text);
    }
    
    if (!location) {
      location = extractLocationFromText(text);
    }
    
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (location) {
      const coords = await geocodeLocation(location);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    // If post_url is provided, try to save to database
    // Note: In production, you'd get the DB from Cloudflare env
    // For now, we'll just return the analysis
    const response = {
      ...analysis,
      location_extracted: location,
      latitude,
      longitude,
      urgent_needs: analysis.urgent_needs.join(', '),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze post' },
      { status: 500 }
    );
  }
}


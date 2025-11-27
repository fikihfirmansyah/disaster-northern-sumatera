import { NextRequest, NextResponse } from 'next/server';
import { scrapeInstagramAccount, scrapeInstagramHashtag, scrapePostDetails } from '@/lib/instagram-scraper';
import { getAllAccounts, getPostByUrl, addPost, addAnalysis } from '@/lib/db';
import { analyzeDisasterPost } from '@/lib/genkit-flow';
import { extractLocationFromText, geocodeLocation } from '@/lib/geocoding';
import { uploadImageToR2, generateR2Key } from '@/lib/r2';
import type { ScrapeRequest } from '@/types';

// Filter date: Only posts from November 25, 2024 onwards
const MIN_DATE = new Date('2024-11-25T00:00:00Z');

function isPostRecent(timestamp: string | null): boolean {
  if (!timestamp) return true; // Include posts without timestamp
  
  try {
    const postDate = new Date(timestamp);
    return postDate >= MIN_DATE;
  } catch (e) {
    return true; // Include if date parsing fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ScrapeRequest = await request.json();
    const { account_url, hashtag } = body;

    if (!account_url && !hashtag) {
      return NextResponse.json(
        { error: 'Either account_url or hashtag is required' },
        { status: 400 }
      );
    }

    let scrapedPosts: any[] = [];

    if (account_url) {
      scrapedPosts = await scrapeInstagramAccount(account_url, 10);
    } else if (hashtag) {
      scrapedPosts = await scrapeInstagramHashtag(hashtag, 10);
    }

    const processedPosts = [];

    for (const scrapedPost of scrapedPosts) {
      // Get full post details
      const fullPost = await scrapePostDetails(scrapedPost.postUrl);
      if (!fullPost) continue;

      // Check if post already exists
      // const db = getDB();
      // const existingPost = await getPostByUrl(db, fullPost.postUrl);
      // if (existingPost) continue;

      // Filter by date - only posts from November 25, 2024 onwards
      if (!isPostRecent(fullPost.timestamp)) {
        continue;
      }

      // Analyze the post text (skip Gemini, use keyword-based)
      if (fullPost.text) {
        const analysis = await analyzeDisasterPost(fullPost.text, true);
        
        // Extract location
        let location = fullPost.locationText || extractLocationFromText(fullPost.text || '');
        let latitude: number | null = null;
        let longitude: number | null = null;

        if (location) {
          const coords = await geocodeLocation(location);
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lng;
          }
        }

        processedPosts.push({
          post_url: fullPost.postUrl,
          image_url: fullPost.imageUrl,
          text: fullPost.text,
          location_text: location,
          latitude,
          longitude,
          timestamp: fullPost.timestamp,
          analysis,
        });
      }
    }

    return NextResponse.json({
      success: true,
      posts: processedPosts,
      count: processedPosts.length,
    });
  } catch (error) {
    console.error('Error in scrape route:', error);
    return NextResponse.json(
      { error: 'Failed to scrape Instagram' },
      { status: 500 }
    );
  }
}


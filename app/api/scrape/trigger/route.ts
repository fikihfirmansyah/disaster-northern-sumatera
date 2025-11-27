import { NextRequest, NextResponse } from "next/server";
import { getAllAccounts, getPostByUrl, getPostIdByUrl, getAnalysisByPostId, addPost, addAnalysis, updatePost, updateAnalysis } from "@/lib/db";
import {
 scrapeInstagramAccount,
 scrapePostDetails,
 initializeCredentials,
} from "@/lib/instagram-scraper";
import { analyzeDisasterPost } from "@/lib/genkit-flow";
import { extractLocationFromText, geocodeLocation } from "@/lib/geocoding";
import { extractLocationWithGemini } from "@/lib/gemini-location";

// Filter date: Only posts from November 25, 2024 onwards
const MIN_DATE = new Date("2024-11-25T00:00:00Z");

function isPostRecent(timestamp: string | null): boolean {
 if (!timestamp) return true; // Include posts without timestamp

 try {
  const postDate = new Date(timestamp);
  return postDate >= MIN_DATE;
 } catch (e) {
  return true; // Include if date parsing fails
 }
}

export async function POST() {
 try {
  // Initialize credentials from database
  await initializeCredentials();
  
  // Get accounts from Firestore
  let accounts;
  try {
   accounts = await getAllAccounts();
  } catch (error) {
   console.warn(
    "Could not fetch accounts from Firestore, using defaults:",
    error
   );
   // Fallback to default accounts if Firestore not configured
   accounts = [
    {
     id: "1",
     account_url: "https://www.instagram.com/kabaraceh/",
     account_username: "kabaraceh",
     created_at: new Date().toISOString(),
     last_scraped_at: null,
     is_active: 1,
    },
    // {
    //  id: "2",
    //  account_url: "https://www.instagram.com/seputaranmedanku/",
    //  account_username: "seputaranmedanku",
    //  created_at: new Date().toISOString(),
    //  last_scraped_at: null,
    //  is_active: 1,
    // },
    // {
    //  id: "3",
    //  account_url: "https://www.instagram.com/brandanstory/",
    //  account_username: "brandanstory",
    //  created_at: new Date().toISOString(),
    //  last_scraped_at: null,
    //  is_active: 1,
    // },
   ];
  }

  const results = [];
  let skippedOldPosts = 0;

  for (const account of accounts) {
   try {
    console.log(`Processing account: ${account.account_url}`);
    // Scrape account
    const scrapedPosts = await scrapeInstagramAccount(account.account_url, 10);
    console.log(
     `Found ${scrapedPosts.length} posts from ${account.account_url}`
    );

    for (let i = 0; i < scrapedPosts.length; i++) {
     const scrapedPost = scrapedPosts[i];
     console.log(
      `Processing post ${i + 1}/${scrapedPosts.length}: ${scrapedPost.postUrl}`
     );

     // Add timeout for each post detail fetch (45 seconds max per post)
     let fullPost: any = null;
     try {
      fullPost = await Promise.race([
       scrapePostDetails(scrapedPost.postUrl, 45000),
       new Promise<null>((resolve) =>
        setTimeout(() => {
         console.log(`Timeout fetching post details: ${scrapedPost.postUrl}`);
         resolve(null);
        }, 45000)
       ),
      ]);
     } catch (error: any) {
      console.error(`Error fetching post details for ${scrapedPost.postUrl}:`, error.message);
      // Continue to next post instead of breaking
      continue;
     }

     if (!fullPost || (!fullPost.text && !fullPost.caption)) {
      console.log(`Skipping post - no text or caption content or timeout`);
      continue;
     }
     
     // Log what we got
     if (fullPost.caption) {
      console.log(`Post has caption (${fullPost.caption.length} chars)`);
     } else if (fullPost.text) {
      console.log(`Post has text but no caption (${fullPost.text.length} chars)`);
     }

     // Filter by date - only posts from November 25, 2024 onwards
     if (!isPostRecent(fullPost.timestamp)) {
      skippedOldPosts++;
      continue;
     }

     // Check if post already exists
     const existingPost = await getPostByUrl(fullPost.postUrl);
     const isUpdate = !!existingPost;
     
     // Use caption for analysis if available, otherwise use text
     const textForAnalysis = fullPost.caption || fullPost.text || '';
     
     // Analyze (skip Gemini, use keyword-based analysis)
     const analysis = await analyzeDisasterPost(textForAnalysis, true);

     // Extract location - try multiple methods
     let location: string | null = null;
     
     // Priority 1: Try Gemini extraction first (most accurate for specific locations)
     if (process.env.GEMINI_API_KEY && (fullPost.caption || fullPost.text)) {
      const geminiLocation = await extractLocationWithGemini(fullPost.caption || fullPost.text || '');
      if (geminiLocation) {
       location = geminiLocation;
       console.log(`Gemini extracted location: ${location}`);
      }
     }
     
     // Priority 2: Use existing location from post if available and Gemini didn't find one
     if (!location) {
      location = fullPost.locationText || null;
     }
     
     // Priority 3: Fallback to regex extraction from caption/text
     if (!location && (fullPost.caption || fullPost.text)) {
      location = extractLocationFromText(fullPost.caption || fullPost.text || '');
      if (location) {
       console.log(`Regex extracted location: ${location}`);
      }
     }
     
     // Get existing coordinates if post already exists
     let latitude: number | null = existingPost?.latitude || null;
     let longitude: number | null = existingPost?.longitude || null;
     
     // If we have a location but no coordinates, geocode it
     if (location && (!latitude || !longitude)) {
      console.log(`Geocoding location "${location}" (coordinates missing)`);
      const coords = await geocodeLocation(location);
      if (coords) {
       latitude = coords.lat;
       longitude = coords.lng;
       console.log(`Geocoded location "${location}" to: ${latitude}, ${longitude}`);
      } else {
       console.warn(`Failed to geocode location: ${location}`);
      }
     } else if (location && latitude && longitude) {
      console.log(`Location "${location}" already has coordinates: ${latitude}, ${longitude}`);
     } else if (!location) {
      console.log('No location found in post');
     }

     // Skip saving if coordinates are missing
     if (!latitude || !longitude) {
      console.log(`Skipping post - no valid coordinates (lat: ${latitude}, lng: ${longitude})`);
      continue;
     }

     // Update or create post in Firestore
     try {
      let postId: string;
      if (isUpdate) {
       postId = existingPost.id;
       console.log(`Updating existing post: ${fullPost.postUrl}`);
       
       // Update post
       await updatePost(postId, {
        account_id: account.id,
        post_url: fullPost.postUrl,
        image_url: fullPost.imageUrl,
        image_r2_key: null,
        text: fullPost.text,
        caption: fullPost.caption,
        hashtags: fullPost.hashtags || [],
        location_text: location,
        latitude,
        longitude,
        timestamp: fullPost.timestamp,
       });

       // Update or create analysis
       const existingAnalysis = await getAnalysisByPostId(postId);
       if (existingAnalysis) {
        await updateAnalysis(existingAnalysis.id, {
         severity: analysis.severity,
         category: analysis.category,
         urgent_needs: analysis.urgent_needs.join(", "),
         disaster_type: analysis.disaster_type,
         location_extracted: analysis.location_extracted,
         confidence: analysis.confidence,
        });
        console.log(`Updated analysis for post: ${postId}`);
       } else {
        await addAnalysis(postId, {
         severity: analysis.severity,
         category: analysis.category,
         urgent_needs: analysis.urgent_needs.join(", "),
         disaster_type: analysis.disaster_type,
         location_extracted: analysis.location_extracted,
         confidence: analysis.confidence,
        });
        console.log(`Created new analysis for post: ${postId}`);
       }
      } else {
       // Create new post
       postId = await addPost({
        account_id: account.id,
        post_url: fullPost.postUrl,
        image_url: fullPost.imageUrl,
        image_r2_key: null,
        text: fullPost.text,
        caption: fullPost.caption,
        hashtags: fullPost.hashtags || [],
        location_text: location,
        latitude,
        longitude,
        timestamp: fullPost.timestamp,
       });

       // Save analysis to Firestore
       await addAnalysis(postId, {
        severity: analysis.severity,
        category: analysis.category,
        urgent_needs: analysis.urgent_needs.join(", "),
        disaster_type: analysis.disaster_type,
        location_extracted: analysis.location_extracted,
        confidence: analysis.confidence,
       });

       console.log(`Saved new post to Firestore: ${postId}`);
      }

      results.push({
       account: account.account_url,
       post_url: fullPost.postUrl,
       post_timestamp: fullPost.timestamp,
       post_id: postId,
       success: true,
       analysis,
       location,
       latitude,
       longitude,
      });
     } catch (dbError) {
      console.error(`Error saving post to Firestore:`, dbError);
      results.push({
       account: account.account_url,
       post_url: fullPost.postUrl,
       success: false,
       error: "Failed to save to database",
      });
     }
    }
   } catch (error) {
    console.error(`Error scraping account ${account.account_url}:`, error);
    results.push({
     account: account.account_url,
     success: false,
     error: error instanceof Error ? error.message : "Unknown error",
    });
   }
  }

  return NextResponse.json({
   success: true,
   results,
   total_processed: results.length,
   skipped_old_posts: skippedOldPosts,
   min_date: MIN_DATE.toISOString(),
  });
 } catch (error) {
  console.error("Error in scrape trigger route:", error);
  return NextResponse.json(
   { error: "Failed to trigger scraping" },
   { status: 500 }
  );
 }
}

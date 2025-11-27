import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Extract location from Instagram caption using Gemini AI
 * @param caption - The Instagram post caption
 * @returns Location name or null if not found
 */
async function extractLocationWithGeminiDirect(
 caption: string
): Promise<string | null> {
 const prompt = `Extract the location name from this Indonesian disaster report caption. Return ONLY the location name, nothing else.

EXAMPLES:
Caption: "Tolong pak keluarga saya terjebak banjir di rumah lantai 2 bengkel Sukarame desa sekoci kecamatan besitang"
Location: "bengkel Sukarame desa sekoci kecamatan besitang"

Caption: "Tolong dong min di pantau area jalan arnan"
Location: "jalan arnan"

Caption: "Tolong info di pelawi gg bakti gimna min"
Location: "pelawi gg bakti"

Caption: "Banjir di Medan, jalan Sudirman"
Location: "jalan Sudirman"

RULES:
1. Extract the MOST SPECIFIC location mentioned (street/landmark > village > district > city)
2. Include the full location phrase as written (e.g., "desa sekoci kecamatan besitang", not just "besitang")
3. If multiple locations, pick the most specific one
4. Return the location EXACTLY as written in the caption
5. DO NOT return generic words like "Locations", "Location", "Area" - only actual place names
6. If no location found, return "null"

Caption: ${caption}

Location:`;

 try {
  // Try latest models first
  const modelNames = [
   "gemini-2.5-flash-lite", // User specified model
   "gemini-2.0-flash-exp", // Latest experimental
   "gemini-1.5-pro-latest", // Latest stable pro
   "gemini-1.5-flash-latest", // Latest stable flash
   "gemini-1.5-pro",
   "gemini-1.5-flash",
   "gemini-pro",
  ];
  let model = null;
  let lastError = null;

  for (const modelName of modelNames) {
   try {
    model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Clean up the response
    if (
     text.toLowerCase() === "null" ||
     text.toLowerCase() === "none" ||
     text.length === 0
    ) {
     return null;
    }

    // Remove quotes if present
    let cleanLocation = text.replace(/^["']|["']$/g, "").trim();

    // Filter out generic words that are not actual locations
    const genericWords = [
     "locations",
     "location",
     "area",
     "areas",
     "place",
     "places",
     "region",
     "regions",
    ];
    if (genericWords.includes(cleanLocation.toLowerCase())) {
     console.warn(
      `Gemini returned generic word "${cleanLocation}", treating as no location found`
     );
     return null;
    }

    return cleanLocation || null;
   } catch (e: any) {
    lastError = e;
    continue;
   }
  }

  if (!model) {
   throw lastError || new Error("No valid Gemini model found");
  }

  return null;
 } catch (error: any) {
  console.error("Error extracting location with Gemini:", error);
  return null;
 }
}

/**
 * Extract location from Instagram caption using Gemini AI
 * @param caption - The Instagram post caption
 * @returns Location name or null if not found
 */
export async function extractLocationWithGemini(
 caption: string
): Promise<string | null> {
 if (!caption || caption.trim().length === 0) {
  return null;
 }

 // Skip if GEMINI_API_KEY is not set
 if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY not set, skipping Gemini location extraction");
  return null;
 }

 try {
  const location = await extractLocationWithGeminiDirect(caption);
  return location;
 } catch (error) {
  console.error("Error in Gemini location extraction:", error);
  return null;
 }
}

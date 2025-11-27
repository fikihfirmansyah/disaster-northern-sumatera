import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalyzeResponse, Severity, DisasterType } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const ANALYSIS_PROMPT = `You are an expert disaster analyst. Analyze the following Instagram post text about disasters in Aceh, North Sumatra, or West Sumatra, Indonesia.

Your task is to:
1. Determine the severity level: "Parah" (Severe), "Sedang" (Moderate), or "Aman" (Safe/Informational)
2. Identify the disaster type (Banjir/Flood, Longsor/Landslide, Gempa/Earthquake, Kebakaran/Fire, Angin Kencang/Strong Wind, or Lainnya/Other)
3. Extract urgent needs mentioned (e.g., "Pakaian", "Makanan", "Tenaga Medis", "Selimut", etc.)
4. Extract location information (city, regency, district names)
5. Provide a confidence score (0-1)

Return your analysis in the following JSON format:
{
  "severity": "Parah" | "Sedang" | "Aman",
  "category": "Terdampak Parah" | "Terdampak Sedang" | "Aman",
  "urgent_needs": ["need1", "need2"],
  "disaster_type": "Banjir" | "Longsor" | "Gempa" | "Kebakaran" | "Angin Kencang" | "Lainnya",
  "location_extracted": "location name or null",
  "confidence": 0.0-1.0
}

Text to analyze:`;

// Keyword-based analysis function
function analyzeWithKeywords(text: string): AnalyzeResponse {
  const textLower = text.toLowerCase();
  
  // Determine severity based on keywords
  let severity: Severity = 'Aman';
  if (textLower.includes('parah') || textLower.includes('kritis') || textLower.includes('darurat') || 
      textLower.includes('urgent') || textLower.includes('mendesak')) {
    severity = 'Parah';
  } else if (textLower.includes('sedang') || textLower.includes('moderat') || 
             textLower.includes('waswas') || textLower.includes('waspada')) {
    severity = 'Sedang';
  }

  // Determine disaster type
  let disasterType: DisasterType = 'Lainnya';
  if (textLower.includes('banjir') || textLower.includes('flood')) {
    disasterType = 'Banjir';
  } else if (textLower.includes('longsor') || textLower.includes('landslide')) {
    disasterType = 'Longsor';
  } else if (textLower.includes('gempa') || textLower.includes('earthquake')) {
    disasterType = 'Gempa';
  } else if (textLower.includes('kebakaran') || textLower.includes('fire')) {
    disasterType = 'Kebakaran';
  } else if (textLower.includes('angin') || textLower.includes('wind')) {
    disasterType = 'Angin Kencang';
  }

  // Extract urgent needs
  const urgentNeeds: string[] = [];
  const needsKeywords = {
    'Pakaian': ['pakaian', 'baju', 'clothing'],
    'Makanan': ['makanan', 'food', 'pangan'],
    'Tenaga Medis': ['medis', 'dokter', 'rumah sakit', 'hospital'],
    'Selimut': ['selimut', 'blanket'],
    'Air': ['air', 'water'],
    'Tenda': ['tenda', 'shelter'],
  };

  for (const [need, keywords] of Object.entries(needsKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      urgentNeeds.push(need);
    }
  }

  return {
    severity,
    category: severity === 'Parah' ? 'Terdampak Parah' : severity === 'Sedang' ? 'Terdampak Sedang' : 'Aman',
    urgent_needs: urgentNeeds,
    disaster_type: disasterType,
    location_extracted: null,
    confidence: 0.5,
  };
}

export async function analyzeDisasterPost(text: string, skipAnalysis: boolean = true): Promise<AnalyzeResponse> {
  // Skip Gemini analysis if flag is set or API key is not configured
  if (skipAnalysis || !process.env.GEMINI_API_KEY) {
    return analyzeWithKeywords(text);
  }

  // Try Gemini analysis if API key is available and not skipped
  try {
    // Try different model names
    const modelNames = ['gemini-1.5-pro', 'gemini-pro', 'gemini-1.5-flash'];
    let model = null;
    let lastError = null;

    for (const modelName of modelNames) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!model) {
      throw lastError || new Error('No valid Gemini model found');
    }

    const prompt = `${ANALYSIS_PROMPT}\n\n${text}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Fallback: try to parse the entire response
      jsonMatch = [responseText];
    }

    const analysis = JSON.parse(jsonMatch[0]) as AnalyzeResponse;

    // Validate and normalize the response
    const severity: Severity = ['Parah', 'Sedang', 'Aman'].includes(analysis.severity)
      ? analysis.severity as Severity
      : 'Aman';

    const disasterType: DisasterType = [
      'Banjir',
      'Longsor',
      'Gempa',
      'Kebakaran',
      'Angin Kencang',
      'Lainnya'
    ].includes(analysis.disaster_type)
      ? analysis.disaster_type as DisasterType
      : 'Lainnya';

    return {
      severity,
      category: analysis.category || (severity === 'Parah' ? 'Terdampak Parah' : severity === 'Sedang' ? 'Terdampak Sedang' : 'Aman'),
      urgent_needs: Array.isArray(analysis.urgent_needs) ? analysis.urgent_needs : [],
      disaster_type: disasterType,
      location_extracted: analysis.location_extracted || null,
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
    };
  } catch (error) {
    console.error('Error analyzing post with Gemini, using fallback:', error);
    
    // Fallback to keyword-based analysis
    return analyzeWithKeywords(text);
  }
}


// Define boundaries for Aceh, North Sumatra, and West Sumatra provinces
// Aceh: roughly lat 2-6, lng 95-98
// North Sumatra: roughly lat 0-4, lng 98-100
// West Sumatra: roughly lat -2-1, lng 99-102
const TARGET_REGION_BOUNDS = {
  minLat: -2.5,
  maxLat: 6.5,
  minLng: 95,
  maxLng: 102
};

function isInTargetRegion(lat: number, lng: number): boolean {
  return lat >= TARGET_REGION_BOUNDS.minLat && 
         lat <= TARGET_REGION_BOUNDS.maxLat && 
         lng >= TARGET_REGION_BOUNDS.minLng && 
         lng <= TARGET_REGION_BOUNDS.maxLng;
}

export async function geocodeLocation(locationName: string): Promise<{ lat: number; lng: number } | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured, skipping geocoding');
    return null;
  }

  if (!locationName || locationName.trim().length === 0) {
    return null;
  }

  // Filter out generic words
  const genericWords = ['locations', 'location', 'area', 'areas', 'place', 'places'];
  if (genericWords.includes(locationName.toLowerCase().trim())) {
    console.warn(`Skipping geocoding for generic word: "${locationName}"`);
    return null;
  }

  try {
    // Try multiple geocoding strategies to find the location in the target provinces
    
    // Strategy 1: Try with specific province names appended
    const provinces = ['Aceh', 'Sumatra Utara', 'Sumatera Utara', 'Sumatra Barat', 'Sumatera Barat', 'North Sumatra', 'West Sumatra'];
    
    for (const province of provinces) {
      const locationWithProvince = `${locationName}, ${province}, Indonesia`;
      const encodedLocation = encodeURIComponent(locationWithProvince);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${process.env.GOOGLE_MAPS_API_KEY}&region=id`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        // Check all results to find one in our target region
        for (const result of data.results) {
          const location = result.geometry.location;
          const lat = location.lat;
          const lng = location.lng;
          
          if (isInTargetRegion(lat, lng)) {
            console.log(`Geocoded "${locationName}" with province "${province}" to: ${lat}, ${lng}`);
            return { lat, lng };
          }
        }
      }
    }

    // Strategy 2: Try with just "Sumatra, Indonesia"
    const locationWithSumatra = `${locationName}, Sumatra, Indonesia`;
    let encodedLocation = encodeURIComponent(locationWithSumatra);
    let url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${process.env.GOOGLE_MAPS_API_KEY}&region=id`;
    
    let response = await fetch(url);
    let data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Check all results to find one in our target region
      for (const result of data.results) {
        const location = result.geometry.location;
        const lat = location.lat;
        const lng = location.lng;
        
        if (isInTargetRegion(lat, lng)) {
          console.log(`Geocoded "${locationName}" with Sumatra to: ${lat}, ${lng}`);
          return { lat, lng };
        }
      }
    }

    // Strategy 3: Try with location as-is (might work for well-known places)
    encodedLocation = encodeURIComponent(locationName);
    url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${process.env.GOOGLE_MAPS_API_KEY}&region=id`;
    
    response = await fetch(url);
    data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Check all results to find one in our target region
      for (const result of data.results) {
        const location = result.geometry.location;
        const lat = location.lat;
        const lng = location.lng;
        
        if (isInTargetRegion(lat, lng)) {
          console.log(`Geocoded "${locationName}" directly to: ${lat}, ${lng}`);
          return { lat, lng };
        }
      }
    }

    // If we got results but none in target region, log warning
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const firstResult = data.results[0].geometry.location;
      console.warn(`Geocoded location "${locationName}" found but outside target region: ${firstResult.lat}, ${firstResult.lng}`);
    }

    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

export function extractLocationFromText(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Common location patterns in Indonesian
  const locationPatterns = [
    // Pattern: "di [Location]" or "di [Location], [Province]"
    /di\s+([A-Z][a-zA-Z\s]+?)(?:\s*,\s*(?:Aceh|Sumatra\s+Utara|Sumatra\s+Barat|Sumatera\s+Utara|Sumatera\s+Barat))?/gi,
    // Pattern: "kota [City]" or "kabupaten [Regency]"
    /(?:kota|kabupaten|kecamatan|desa|kelurahan)\s+([A-Z][a-zA-Z\s]+?)(?:\s*,\s*(?:Aceh|Sumatra|Sumatera))?/gi,
    // Pattern: "[Location] Aceh" or "[Location] Sumatra"
    /([A-Z][a-zA-Z\s]+?)\s+(?:Aceh|Sumatra\s+Utara|Sumatra\s+Barat|Sumatera\s+Utara|Sumatera\s+Barat|Medan|Padang|Banda\s+Aceh)/gi,
    // Pattern: Common city names in the region
    /(?:Medan|Banda\s+Aceh|Padang|Binjai|Langsa|Lhokseumawe|Tembung|Brandan|Deli\s+Serdang|Aceh\s+Barat|Aceh\s+Utara|Aceh\s+Selatan|Aceh\s+Timur)/gi,
    // Pattern: "[Location] yang terdampak" or "[Location] terdampak"
    /([A-Z][a-zA-Z\s]+?)\s+yang\s+terdampak/gi,
    // Pattern: "wilayah [Location]" or "daerah [Location]"
    /(?:wilayah|daerah|area)\s+([A-Z][a-zA-Z\s]+?)(?:\s*,\s*(?:Aceh|Sumatra|Sumatera))?/gi,
  ];

  const foundLocations: string[] = [];

  for (const pattern of locationPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        let location = match[1].trim();
        // Clean up common prefixes
        location = location.replace(/^(di|kota|kabupaten|kecamatan|desa|kelurahan|wilayah|daerah|area)\s+/i, '').trim();
        // Remove trailing commas and common words
        location = location.replace(/,\s*$/, '').trim();
        // Skip if too short or common words
        if (location.length > 2 && !/^(yang|terdampak|dan|atau)$/i.test(location)) {
          foundLocations.push(location);
        }
      } else if (match[0]) {
        // For patterns without capture groups (like city names)
        let location = match[0].trim();
        if (location.length > 2) {
          foundLocations.push(location);
        }
      }
    }
  }

  // Remove duplicates and return the first valid location
  const uniqueLocations = [...new Set(foundLocations)];
  
  if (uniqueLocations.length > 0) {
    // Prefer longer location names (more specific)
    uniqueLocations.sort((a, b) => b.length - a.length);
    return uniqueLocations[0];
  }

  return null;
}


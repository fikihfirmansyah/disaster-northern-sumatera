/**
 * Google Maps Routes API (Directions API) helper functions
 */

export interface RouteInfo {
  distance: string;
  duration: string;
  polyline: string;
  steps: Array<{
    instruction: string;
    distance: string;
    duration: string;
    location: { lat: number; lng: number };
  }>;
  warnings?: string[];
}

/**
 * Get route between two points using Google Directions API
 */
export async function getRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  waypoints?: Array<{ lat: number; lng: number }>
): Promise<RouteInfo | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured');
    return null;
  }

  try {
    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = `${destination.lat},${destination.lng}`;
    
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${process.env.GOOGLE_MAPS_API_KEY}&region=id&language=id`;
    
    if (waypoints && waypoints.length > 0) {
      const waypointStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
      url += `&waypoints=${encodeURIComponent(waypointStr)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      return {
        distance: leg.distance.text,
        duration: leg.duration.text,
        polyline: route.overview_polyline.points,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.text,
          duration: step.duration.text,
          location: {
            lat: step.start_location.lat,
            lng: step.start_location.lng,
          },
        })),
        warnings: route.warnings || [],
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

/**
 * Check if a route passes through disaster areas
 */
export function checkRouteThroughDisasterAreas(
  routePolyline: string,
  disasterPosts: Array<{ latitude: number | null; longitude: number | null; analysis?: { severity: string } | null }>
): { blocked: boolean; severity: 'Parah' | 'Sedang' | 'Aman'; affectedPoints: number } {
  // This is a simplified check - in production, you'd decode the polyline
  // and check if any points are near disaster locations
  const severePosts = disasterPosts.filter(
    p => p.latitude && p.longitude && p.analysis?.severity === 'Parah'
  );

  if (severePosts.length > 0) {
    return {
      blocked: true,
      severity: 'Parah',
      affectedPoints: severePosts.length,
    };
  }

  const moderatePosts = disasterPosts.filter(
    p => p.latitude && p.longitude && p.analysis?.severity === 'Sedang'
  );

  if (moderatePosts.length > 0) {
    return {
      blocked: false,
      severity: 'Sedang',
      affectedPoints: moderatePosts.length,
    };
  }

  return {
    blocked: false,
    severity: 'Aman',
    affectedPoints: 0,
  };
}


'use client';

import { useEffect, useRef, useState } from 'react';
import type { PostWithAnalysis, Severity } from '@/types';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: typeof google;
  }
}

interface DisasterMapProps {
  posts: PostWithAnalysis[];
  onMarkerClick: (post: PostWithAnalysis) => void;
  showIsolatedAreas?: boolean;
}

const getMarkerColor = (severity: Severity | null): string => {
  switch (severity) {
    case 'Parah':
      return '#ef4444'; // Red
    case 'Sedang':
      return '#eab308'; // Yellow
    case 'Aman':
      return '#22c55e'; // Green
    default:
      return '#6b7280'; // Gray
  }
};

export default function DisasterMap({ posts, onMarkerClick, showIsolatedAreas = true }: DisasterMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [polylines, setPolylines] = useState<google.maps.Polyline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey || mapsLoaded) return;

    // Check if script is already loaded
    if (window.google && window.google.maps) {
      setMapsLoaded(true);
      return;
    }

    // Load the script with required libraries
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapsLoaded(true);
      console.log('Google Maps script loaded');
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [apiKey, mapsLoaded]);

  // Initialize map once script is loaded
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || map) return;

    const initMap = async () => {
      // Wait for google.maps.Map to be available
      const waitForGoogleMaps = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          
          const checkMaps = () => {
            if (window.google?.maps?.Map) {
              resolve();
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkMaps, 100);
            } else {
              reject(new Error('Google Maps API failed to load after 5 seconds'));
            }
          };
          
          checkMaps();
        });
      };

      try {
        // Wait for Google Maps to be fully loaded
        await waitForGoogleMaps();

        if (!mapRef.current) {
          console.error('Map container ref is not available');
          setIsLoading(false);
          return;
        }

        if (!window.google?.maps?.Map) {
          throw new Error('Google Maps Map constructor not available');
        }

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: { lat: 3.5952, lng: 98.6722 }, // Center of Sumatra
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        setMap(mapInstance);
        setIsLoading(false);
        console.log('Google Maps initialized successfully');
      } catch (error: any) {
        console.error('Error initializing Google Maps:', error);
        setIsLoading(false);
      }
    };

    // Start initialization
    initMap();
  }, [mapsLoaded, map]);

  // Function to create a circular polygon around a point (for isolated areas)
  const createCirclePolygon = (center: { lat: number; lng: number }, radiusKm: number): google.maps.LatLng[] => {
    const points: google.maps.LatLng[] = [];
    const numPoints = 32;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 360) / numPoints;
      const dx = radiusKm * Math.cos((angle * Math.PI) / 180) / 111; // 111 km per degree latitude
      const dy = radiusKm * Math.sin((angle * Math.PI) / 180) / (111 * Math.cos((center.lat * Math.PI) / 180));
      
      points.push(
        new window.google.maps.LatLng(center.lat + dx, center.lng + dy)
      );
    }
    
    return points;
  };

  // Function to detect isolated areas and congested routes
  const detectIsolatedAreas = (posts: PostWithAnalysis[]): Array<{
    center: { lat: number; lng: number };
    severity: Severity;
    count: number;
    radius: number;
  }> => {
    const areas: Array<{
      center: { lat: number; lng: number };
      severity: Severity;
      count: number;
      radius: number;
    }> = [];

    // Group posts by proximity (within 5km)
    const processed = new Set<number>();
    const clusterRadius = 0.05; // ~5km in degrees

    posts.forEach((post, index) => {
      if (!post.latitude || !post.longitude || processed.has(index)) return;

      const cluster: PostWithAnalysis[] = [post];
      processed.add(index);

      // Find nearby posts
      posts.forEach((otherPost, otherIndex) => {
        if (otherIndex === index || !otherPost.latitude || !otherPost.longitude || processed.has(otherIndex)) return;

        const distance = Math.sqrt(
          Math.pow(post.latitude! - otherPost.latitude!, 2) +
          Math.pow(post.longitude! - otherPost.longitude!, 2)
        );

        if (distance < clusterRadius) {
          cluster.push(otherPost);
          processed.add(otherIndex);
        }
      });

      // Only create area if cluster has 2+ posts or has severe posts
      if (cluster.length >= 2 || cluster.some(p => p.analysis?.severity === 'Parah')) {
        // Calculate center
        const avgLat = cluster.reduce((sum, p) => sum + (p.latitude || 0), 0) / cluster.length;
        const avgLng = cluster.reduce((sum, p) => sum + (p.longitude || 0), 0) / cluster.length;

        // Determine severity (use highest severity in cluster)
        const severities = cluster.map(p => p.analysis?.severity).filter(Boolean) as Severity[];
        const severityPriority = { 'Parah': 3, 'Sedang': 2, 'Aman': 1 };
        const maxSeverity = severities.reduce((max, s) => 
          severityPriority[s] > severityPriority[max] ? s : max, 'Aman' as Severity
        );

        // Calculate radius based on cluster spread
        const maxDistance = Math.max(...cluster.map(p => {
          if (!p.latitude || !p.longitude) return 0;
          return Math.sqrt(
            Math.pow(p.latitude - avgLat, 2) +
            Math.pow(p.longitude - avgLng, 2)
          );
        }));

        areas.push({
          center: { lat: avgLat, lng: avgLng },
          severity: maxSeverity,
          count: cluster.length,
          radius: Math.max(maxDistance * 111, 2) // Minimum 2km, convert degrees to km
        });
      }
    });

    return areas;
  };

  useEffect(() => {
    if (!map) return;

    // Clear existing markers, polygons, and polylines
    markers.forEach(marker => marker.setMap(null));
    polygons.forEach(polygon => polygon.setMap(null));
    polylines.forEach(polyline => polyline.setMap(null));

    const newMarkers: google.maps.Marker[] = [];
    const newPolygons: google.maps.Polygon[] = [];
    const newPolylines: google.maps.Polyline[] = [];

    // Create markers for posts
    posts.forEach((post) => {
      if (!post.latitude || !post.longitude) return;

      const severity = post.analysis?.severity || null;
      const color = getMarkerColor(severity);

      const marker = new window.google.maps.Marker({
        position: { lat: post.latitude, lng: post.longitude },
        map,
        title: post.location_text || 'Unknown location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        onMarkerClick(post);
      });

      newMarkers.push(marker);
    });

    // Create isolated areas if enabled
    if (showIsolatedAreas && posts.length > 0) {
      const isolatedAreas = detectIsolatedAreas(posts);

      isolatedAreas.forEach((area) => {
        const color = getMarkerColor(area.severity);
        const polygonPath = createCirclePolygon(area.center, area.radius);

        const polygon = new window.google.maps.Polygon({
          paths: polygonPath,
          strokeColor: color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.15,
          map,
          zIndex: 1,
        });

        // Add info window on click
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">
                ${area.severity === 'Parah' ? '⚠️ Area Terisolasi' : area.severity === 'Sedang' ? '⚠️ Area Terdampak' : 'ℹ️ Area Terpantau'}
              </h3>
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Jumlah Laporan:</strong> ${area.count}<br/>
                <strong>Tingkat Keparahan:</strong> ${area.severity}<br/>
                <strong>Radius:</strong> ~${Math.round(area.radius)} km
              </p>
            </div>
          `,
        });

        polygon.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
          }
        });

        newPolygons.push(polygon);
      });

      // Create warning zones for severe posts (smaller radius, more visible)
      posts
        .filter(post => post.analysis?.severity === 'Parah' && post.latitude && post.longitude)
        .forEach((post) => {
          const warningPath = createCirclePolygon(
            { lat: post.latitude!, lng: post.longitude! },
            1.5 // 1.5km radius for warning zones
          );

          const warningPolygon = new window.google.maps.Polygon({
            paths: warningPath,
            strokeColor: '#ef4444',
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: '#ef4444',
            fillOpacity: 0.2,
            map,
            zIndex: 2,
          });

          newPolygons.push(warningPolygon);
        });

      // Detect blocked routes if geometry library is available
      if (window.google?.maps?.geometry && posts.length > 0) {
        // Function to decode polyline
        const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
          const points: Array<{ lat: number; lng: number }> = [];
          let index = 0;
          const len = encoded.length;
          let lat = 0;
          let lng = 0;

          while (index < len) {
            let b: number;
            let shift = 0;
            let result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
              b = encoded.charCodeAt(index++) - 63;
              result |= (b & 0x1f) << shift;
              shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
          }

          return points;
        };

        // Major cities in the region
        const majorCities = [
          { name: 'Medan', lat: 3.5952, lng: 98.6722 },
          { name: 'Banda Aceh', lat: 5.5483, lng: 95.3238 },
          { name: 'Padang', lat: -0.9492, lng: 100.3543 },
          { name: 'Binjai', lat: 3.8011, lng: 98.4853 },
          { name: 'Langsa', lat: 4.4683, lng: 97.9683 },
        ];

        // Check routes between nearby cities
        Promise.all(
          majorCities.flatMap((city1, i) =>
            majorCities.slice(i + 1).map(async (city2) => {
              // Only check routes between nearby cities (within 200km)
              const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                new window.google.maps.LatLng(city1.lat, city1.lng),
                new window.google.maps.LatLng(city2.lat, city2.lng)
              );

              if (distance > 200000) return; // Skip if > 200km

              try {
                const response = await fetch(
                  `/api/routes?origin_lat=${city1.lat}&origin_lng=${city1.lng}&dest_lat=${city2.lat}&dest_lng=${city2.lng}`
                );

                if (response.ok) {
                  const data = await response.json();
                  if (data.route) {
                    const routePath = decodePolyline(data.route.polyline);
                    
                    // Check if route passes through disaster areas
                    const nearbyPosts = posts.filter(post => {
                      if (!post.latitude || !post.longitude) return false;
                      
                      // Check if post is within 2km of any point on the route
                      return routePath.some(point => {
                        const pointLatLng = new window.google.maps.LatLng(point.lat, point.lng);
                        const postLatLng = new window.google.maps.LatLng(post.latitude, post.longitude);
                        const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
                          pointLatLng,
                          postLatLng
                        );
                        return dist < 2000; // 2km
                      });
                    });

                    if (nearbyPosts.length > 0) {
                      const hasSevere = nearbyPosts.some(p => p.analysis?.severity === 'Parah');
                      const color = hasSevere ? '#ef4444' : '#eab308';

                      const polyline = new window.google.maps.Polyline({
                        path: routePath,
                        strokeColor: color,
                        strokeOpacity: 0.8,
                        strokeWeight: hasSevere ? 5 : 3,
                        map,
                        zIndex: 3,
                      });

                      // Add info window
                      const infoWindow = new window.google.maps.InfoWindow({
                        content: `
                          <div style="padding: 8px;">
                            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: ${color};">
                              ${hasSevere ? '🚫 Rute Terblokir' : '⚠️ Rute Terdampak'}
                            </h3>
                            <p style="margin: 4px 0; font-size: 14px;">
                              <strong>Rute:</strong> ${city1.name} → ${city2.name}<br/>
                              <strong>Jarak:</strong> ${data.route.distance}<br/>
                              <strong>Durasi:</strong> ${data.route.duration}<br/>
                              <strong>Laporan di Rute:</strong> ${nearbyPosts.length}
                            </p>
                          </div>
                        `,
                      });

                      polyline.addListener('click', (e: google.maps.MapMouseEvent) => {
                        if (e.latLng) {
                          infoWindow.setPosition(e.latLng);
                          infoWindow.open(map);
                        }
                      });

                      newPolylines.push(polyline);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error checking route ${city1.name} → ${city2.name}:`, error);
              }
            })
          )
        ).then(() => {
          setPolylines(newPolylines);
        });
      }
    }

    setMarkers(newMarkers);
    setPolygons(newPolygons);
    setPolylines(newPolylines);

    // Fit bounds to show all markers, or show default view
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });
      map.fitBounds(bounds);
    } else {
      // Default view: Center of Sumatra
      map.setCenter({ lat: 3.5952, lng: 98.6722 });
      map.setZoom(7);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, posts, showIsolatedAreas]);

  return (
    <div className="w-full h-full min-h-[400px] relative">
      {/* Always render the map container so ref is available */}
      <div 
        ref={mapRef} 
        className="w-full h-full" 
        style={{ minHeight: '400px' }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* API Key error overlay */}
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center p-4">
            <p className="text-red-600 font-semibold mb-2">Google Maps API key not configured</p>
            <p className="text-sm text-gray-600">
              Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file
            </p>
          </div>
        </div>
      )}

      {/* API Key configuration error */}
      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !isLoading && !map && (
        <div className="absolute inset-0 flex items-center justify-center bg-yellow-50 z-20">
          <div className="text-center p-4 max-w-md">
            <p className="text-yellow-800 font-semibold mb-2">Google Maps API Configuration Issue</p>
            <p className="text-sm text-yellow-700 mb-4">
              Check the browser console for details. Common issues:
            </p>
            <ul className="text-xs text-yellow-700 text-left space-y-1">
              <li>• Enable "Maps JavaScript API" in Google Cloud Console</li>
              <li>• Check API key restrictions (HTTP referrers)</li>
              <li>• Ensure billing is enabled for your project</li>
              <li>• Verify the API key is correct</li>
            </ul>
          </div>
        </div>
      )}

      {/* No map overlay */}
      {!isLoading && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !map && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
          <div className="text-center">
            <p className="text-gray-600">Initializing map...</p>
          </div>
        </div>
      )}

      {/* No posts message */}
      {!isLoading && map && posts.length === 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-md z-10">
          <p className="text-sm">No posts with location data found</p>
        </div>
      )}
    </div>
  );
}


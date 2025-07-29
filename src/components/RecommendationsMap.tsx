import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { RecommendationCard } from '@/components/RecommendationCard';
import { SearchIcon, X } from 'lucide-react';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  cuisine?: string;
  priceRange?: number;
  rating?: number;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  reasoning?: string;
  reviewCount?: number;
  googleMapsUrl?: string;
}

interface RecommendationsMapProps {
  userRatedRestaurants: any[];
  onClose: () => void;
  onAddRestaurant: (restaurant: any) => void;
}

export function RecommendationsMap({ userRatedRestaurants, onClose, onAddRestaurant }: RecommendationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const currentPopup = useRef<mapboxgl.Popup | null>(null);
  const { token, isLoading } = useMapboxToken();
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(true);
  const [searchCache, setSearchCache] = useState<Map<string, Restaurant[]>>(new Map());

  // Calculate user's preferred price range
  const getUserPreferredPriceRange = () => {
    if (!userRatedRestaurants.length) return '$';
    
    const priceCounts = userRatedRestaurants.reduce((acc, restaurant) => {
      const price = restaurant.priceRange || '$';
      acc[price] = (acc[price] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(priceCounts).reduce((a, b) => 
      priceCounts[a[0]] > priceCounts[b[0]] ? a : b
    )[0];
  };

  const preferredPriceRange = getUserPreferredPriceRange();

  useEffect(() => {
    if (!token || !mapContainer.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.006, 40.7128], // NYC default
      zoom: 12
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('moveend', () => {
      setShowSearchButton(true);
    });

    return () => {
      map.current?.remove();
    };
  }, [token]);

  const searchArea = async () => {
    if (!map.current) return;

    setIsSearching(true);
    setShowSearchButton(false);

    const bounds = map.current.getBounds();
    const center = map.current.getCenter();

    console.log('Map search - Center:', center);
    console.log('Map search - Bounds:', bounds);
    console.log('Map search - Preferred price range:', preferredPriceRange);

    try {
      // Much higher limits for small areas to show ALL available restaurants
      const zoom = map.current.getZoom();
      
      // Calculate search radius based on visible map area
      const mapBounds = map.current.getBounds();
      const ne = mapBounds.getNorthEast();
      const sw = mapBounds.getSouthWest();
      const mapWidthKm = Math.abs(ne.lng - sw.lng) * 111; // roughly 111km per degree
      const mapHeightKm = Math.abs(ne.lat - sw.lat) * 111;
      const visibleAreaKm = Math.max(mapWidthKm, mapHeightKm);
      
      // Use visible area size to determine radius - search slightly beyond visible area
      const radius = Math.max(300, Math.min(visibleAreaKm * 600, 3000)); // 300m to 3km
      
      // ULTRA AGGRESSIVE limits - show massive amounts of restaurants in small areas
      const limit = zoom > 17 ? 1000 :  // Show ALL restaurants when extremely zoomed in
                    zoom > 15 ? 800 :   // Show many restaurants for small areas
                    zoom > 13 ? 600 :   // City blocks
                    zoom > 11 ? 400 :   // Neighborhoods  
                    300;                // Districts
      
      console.log('Optimized search parameters:', {
        zoom,
        visibleAreaKm: visibleAreaKm.toFixed(2),
        searchRadius: radius,
        limit
      });
      
      const requestBody = {
        location: `${center.lat},${center.lng}`,
        radius: Math.round(radius),
        limit: limit,
        type: 'restaurant'
      };
      
      console.log('Map search - Request body:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: requestBody
      });

      console.log('Map search - Response data:', data);
      console.log('Map search - Response error:', error);

      if (error) {
        console.error('Error fetching recommendations:', error);
        toast.error('Failed to fetch recommendations');
        return;
      }

      if (data?.results) {
        console.log('Raw API results count:', data.results.length);
        console.log('First 3 raw results:', data.results.slice(0, 3));
        
        // MINIMAL filtering - just check for valid coordinates and basic bounds
        const filteredRecommendations = data.results
          .filter((restaurant: any) => {
            // Check if restaurant has any location data
            const hasLocation = restaurant.location?.lat && restaurant.location?.lng;
            if (!hasLocation) {
              console.log('Restaurant missing location:', restaurant.name);
              return false;
            }
            
            // PRECISE bounds check - only show restaurants in visible map area
            // NO padding - exact visible area only
            const exactBounds = {
              south: bounds.getSouth(),
              north: bounds.getNorth(), 
              west: bounds.getWest(),
              east: bounds.getEast()
            };
            
            const inVisibleArea = restaurant.location.lat >= exactBounds.south &&
                                restaurant.location.lat <= exactBounds.north &&
                                restaurant.location.lng >= exactBounds.west &&
                                restaurant.location.lng <= exactBounds.east;
            
            if (!inVisibleArea) {
              console.log('Restaurant outside visible area:', restaurant.name, {
                lat: restaurant.location.lat,
                lng: restaurant.location.lng,
                visibleBounds: exactBounds
              });
            }
            
            return inVisibleArea;
          })
          .map((restaurant: any) => ({
            id: restaurant.id,
            name: restaurant.name,
            address: restaurant.address,
            cuisine: restaurant.cuisine || 'Restaurant',
            priceRange: typeof restaurant.priceRange === 'number' ? restaurant.priceRange : 1,
            rating: restaurant.rating,
            latitude: restaurant.location?.lat,
            longitude: restaurant.location?.lng,
            photos: restaurant.photos || [],
            reasoning: `Found in search area`,
            reviewCount: restaurant.reviewCount || 0,
            googleMapsUrl: restaurant.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`
          }));

        console.log('After basic filtering:', filteredRecommendations.length);
        console.log('Filtered recommendations:', filteredRecommendations.slice(0, 3));

        setRecommendations(filteredRecommendations);
        
        // Cache results for faster future searches
        const cacheKey = `${center.lat.toFixed(4)},${center.lng.toFixed(4)},${Math.floor(zoom)}`;
        const newCache = new Map(searchCache);
        newCache.set(cacheKey, filteredRecommendations);
        setSearchCache(newCache);
        console.log('Cached results for key:', cacheKey);

        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Add new markers to map with beautiful styled popups
        filteredRecommendations.forEach((restaurant: Restaurant) => {
          if (restaurant.latitude && restaurant.longitude) {
            // Create a beautiful popup HTML
            const priceDisplay = '$'.repeat(restaurant.priceRange || 1);
            const ratingStars = '★'.repeat(Math.floor(restaurant.rating || 0)) + 
                               '☆'.repeat(5 - Math.floor(restaurant.rating || 0));
            
            const popupHTML = `
              <div class="restaurant-popup" style="
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 280px;
                padding: 0;
                margin: 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
                background: white;
              ">
                <div style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 16px;
                  text-align: center;
                ">
                  <h3 style="
                    margin: 0 0 8px 0;
                    font-size: 18px;
                    font-weight: 600;
                    line-height: 1.3;
                  ">${restaurant.name}</h3>
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-top: 8px;
                  ">
                    <span style="
                      background: rgba(255, 255, 255, 0.2);
                      padding: 4px 8px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                    ">${restaurant.cuisine || 'Restaurant'}</span>
                    <span style="
                      background: rgba(255, 255, 255, 0.2);
                      padding: 4px 8px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                    ">${priceDisplay}</span>
                  </div>
                </div>
                
                <div style="padding: 16px;">
                  <div style="
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                  ">
                    <span style="
                      color: #fbbf24;
                      font-size: 16px;
                      line-height: 1;
                    ">${ratingStars}</span>
                    <span style="
                      font-weight: 600;
                      color: #374151;
                      font-size: 14px;
                    ">${restaurant.rating?.toFixed(1) || 'N/A'}</span>
                    <span style="
                      color: #6b7280;
                      font-size: 12px;
                    ">(${restaurant.reviewCount || 0} reviews)</span>
                  </div>
                  
                  <div style="
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin-bottom: 12px;
                  ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#6b7280" style="margin-top: 2px; flex-shrink: 0;">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span style="
                      color: #6b7280;
                      font-size: 12px;
                      line-height: 1.4;
                    ">${restaurant.address}</span>
                  </div>
                  
                  <div style="
                    border-top: 1px solid #e5e7eb;
                    padding-top: 12px;
                    display: flex;
                    gap: 8px;
                  ">
                    <button onclick="window.open('${restaurant.googleMapsUrl}', '_blank')" style="
                      flex: 1;
                      background: #667eea;
                      color: white;
                      border: none;
                      padding: 8px 12px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: background 0.2s;
                    " onmouseover="this.style.background='#5a67d8'" onmouseout="this.style.background='#667eea'">
                      View on Maps
                    </button>
                    <button onclick="navigator.share ? navigator.share({title: '${restaurant.name}', url: '${restaurant.googleMapsUrl}'}) : navigator.clipboard.writeText('${restaurant.googleMapsUrl}')" style="
                      flex: 1;
                      background: #f3f4f6;
                      color: #374151;
                      border: none;
                      padding: 8px 12px;
                      border-radius: 6px;
                      font-size: 12px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: background 0.2s;
                    " onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
                      Share
                    </button>
                  </div>
                </div>
              </div>
            `;

            const popup = new mapboxgl.Popup({ 
              offset: 25,
              closeButton: true,
              closeOnClick: true,
              maxWidth: '300px',
              className: 'custom-popup'
            }).setHTML(popupHTML);

            const marker = new mapboxgl.Marker({
              color: '#ef4444'
            })
              .setLngLat([restaurant.longitude, restaurant.latitude])
              .setPopup(popup)
              .addTo(map.current!);

            // Close any existing popup when this marker is clicked
            marker.getElement().addEventListener('click', () => {
              if (currentPopup.current && currentPopup.current !== popup) {
                currentPopup.current.remove();
              }
              currentPopup.current = popup;
            });
            
            // Track popup close events
            popup.on('close', () => {
              if (currentPopup.current === popup) {
                currentPopup.current = null;
              }
            });
            
            markers.current.push(marker);
          }
        });
      }
    } catch (error) {
      console.error('Error searching area:', error);
      toast.error('Failed to search area');
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div>Loading map...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex">
      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Close Button */}
        <Button
          onClick={onClose}
          variant="outline"
          size="icon"
          className="absolute top-4 left-4 z-10"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Search Area Button */}
        {showSearchButton && (
          <Button
            onClick={searchArea}
            disabled={isSearching}
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10"
          >
            <SearchIcon className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search This Area'}
          </Button>
        )}

        {/* Loading Overlay */}
        {isSearching && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
            <div className="bg-card p-6 rounded-lg shadow-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-lg font-medium">Finding restaurants...</span>
            </div>
          </div>
        )}

        {/* Price Range Info */}
        <div className="absolute bottom-4 left-4 bg-card p-3 rounded-lg shadow-lg z-10">
          <p className="text-sm text-muted-foreground">
            Showing {preferredPriceRange} restaurants based on your preferences
          </p>
        </div>
      </div>

      {/* Recommendations Sidebar */}
      <div className="w-96 bg-background border-l overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-4">
            Area Recommendations ({recommendations.length})
          </h2>
          
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground">
              Move the map and click "Search This Area" to find recommendations
            </p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((restaurant) => (
                <RecommendationCard
                  key={restaurant.id}
                  restaurant={{
                    ...restaurant,
                    cuisine: restaurant.cuisine || 'Restaurant',
                    priceRange: typeof restaurant.priceRange === 'number' ? restaurant.priceRange : 1
                  }}
                  onAdd={() => onAddRestaurant({ ...restaurant, userRating: 5 })}
                  onAddToWishlist={() => onAddRestaurant({ ...restaurant, isWishlist: true })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
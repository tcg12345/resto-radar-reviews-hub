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
  priceRange?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  reasoning?: string;
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
            priceRange: restaurant.priceRange || 1,
            rating: restaurant.rating,
            latitude: restaurant.location?.lat,
            longitude: restaurant.location?.lng,
            photos: restaurant.photos || [],
            reasoning: `Found in search area`
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

        // Add new markers to map
        filteredRecommendations.forEach((restaurant: Restaurant) => {
          if (restaurant.latitude && restaurant.longitude) {
            const marker = new mapboxgl.Marker({
              color: '#ef4444'
            })
              .setLngLat([restaurant.longitude, restaurant.latitude])
              .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold">${restaurant.name}</h3>
                  <p class="text-sm text-gray-600">${restaurant.cuisine || ''}</p>
                  <p class="text-sm">${restaurant.priceRange || ''}</p>
                </div>
              `))
              .addTo(map.current!);
            
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
                    priceRange: restaurant.priceRange ? restaurant.priceRange.length : 1
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
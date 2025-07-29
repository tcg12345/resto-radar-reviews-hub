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
  const { token, isLoading } = useMapboxToken();
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(true);

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

    try {
      // Get nearby restaurants with price filtering  
      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: {
          query: 'restaurant',
          latitude: center.lat,
          longitude: center.lng,
          radius: 5000, // 5km radius
          limit: 50,
          type: 'restaurant'
        }
      });

      if (error) {
        console.error('Error fetching recommendations:', error);
        toast.error('Failed to fetch recommendations');
        return;
      }

      if (data?.results) {
        const filteredRecommendations = data.results
          .filter((restaurant: any) => 
            restaurant.location?.lat && 
            restaurant.location?.lng &&
            restaurant.location.lat >= bounds.getSouth() &&
            restaurant.location.lat <= bounds.getNorth() &&
            restaurant.location.lng >= bounds.getWest() &&
            restaurant.location.lng <= bounds.getEast()
          )
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
            reasoning: `Recommended based on your preference for ${preferredPriceRange} restaurants. This ${restaurant.cuisine || 'restaurant'} matches your taste profile.`
          }));

        setRecommendations(filteredRecommendations);

        // Add markers to map
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
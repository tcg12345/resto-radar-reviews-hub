import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { supabase } from '@/integrations/supabase/client';
import { SearchIcon, X, ChevronUp, Filter, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
interface MobileRecommendationsMapProps {
  userRatedRestaurants: any[];
  onClose: () => void;
  onAddRestaurant: (restaurant: any) => void;
}
export function MobileRecommendationsMap({
  userRatedRestaurants,
  onClose,
  onAddRestaurant
}: MobileRecommendationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const currentPopup = useRef<mapboxgl.Popup | null>(null);
  const {
    token,
    isLoading
  } = useMapboxToken();
  const [recommendations, setRecommendations] = useState<Restaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchButton, setShowSearchButton] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [bottomSheetHeight, setBottomSheetHeight] = useState('33%');

  // Calculate user's preferred price range and determine search strategy
  const getUserPreferredPriceRange = () => {
    if (!userRatedRestaurants.length) return {
      range: '$$$',
      isExpensive: true
    };
    const priceCounts = userRatedRestaurants.reduce((acc, restaurant) => {
      const price = restaurant.priceRange || 1;
      const priceStr = '$'.repeat(price);
      acc[priceStr] = (acc[priceStr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommonPrice = Object.entries(priceCounts).reduce((a, b) => priceCounts[a[0]] > priceCounts[b[0]] ? a : b)[0];
    const isExpensive = mostCommonPrice.length >= 3; // 3+ dollar signs

    return {
      range: mostCommonPrice,
      isExpensive,
      defaultRange: isExpensive ? '$$$' : '$'
    };
  };
  const userPricePreference = getUserPreferredPriceRange();
  const preferredPriceRange = userPricePreference.range;
  useEffect(() => {
    if (!token || !mapContainer.current) return;
    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-74.006, 40.7128],
      // NYC default
      zoom: 12
    });

    // Add mobile-optimized controls
    map.current.addControl(new mapboxgl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: false
    }), 'top-right');

    // Add geolocation control
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    }), 'top-right');
    map.current.on('moveend', () => {
      setShowSearchButton(true);
    });

    // Disable map rotation for better mobile UX
    map.current.dragRotate.disable();
    map.current.touchZoomRotate.disableRotation();
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
    const zoom = map.current.getZoom();

    // Calculate search radius based on visible map area
    const mapBounds = map.current.getBounds();
    const ne = mapBounds.getNorthEast();
    const sw = mapBounds.getSouthWest();
    const mapWidthKm = Math.abs(ne.lng - sw.lng) * 111;
    const mapHeightKm = Math.abs(ne.lat - sw.lat) * 111;
    const visibleAreaKm = Math.max(mapWidthKm, mapHeightKm);
    const radius = Math.max(300, Math.min(visibleAreaKm * 600, 3000));

    // Mobile-optimized limits - smaller for better performance
    const limit = zoom > 17 ? 200 : zoom > 15 ? 150 : zoom > 13 ? 100 : zoom > 11 ? 80 : 60;

    // Determine price range strategy based on zoom level and user preferences
    const isZoomedIn = zoom > 15; // Consider zoom > 15 as "zoomed in"
    let targetPriceRanges: number[];
    if (userPricePreference.isExpensive) {
      // User prefers expensive restaurants (3-4 dollar signs)
      targetPriceRanges = isZoomedIn ? [1, 2] : [3, 4]; // Show cheaper when zoomed in
    } else {
      // User prefers cheaper restaurants (1-2 dollar signs)
      targetPriceRanges = [1, 2]; // Always show cheaper restaurants
    }
    try {
      const requestBody = {
        location: `${center.lat},${center.lng}`,
        radius: Math.round(radius),
        limit: limit,
        type: 'restaurant',
        priceRanges: targetPriceRanges
      };
      const {
        data,
        error
      } = await supabase.functions.invoke('restaurant-search', {
        body: requestBody
      });
      if (error) {
        console.error('Error fetching recommendations:', error);
        toast.error('Failed to fetch recommendations');
        return;
      }
      if (data?.results) {
        const filteredRecommendations = data.results.filter((restaurant: any) => {
          const hasLocation = restaurant.location?.lat && restaurant.location?.lng;
          if (!hasLocation) return false;
          const exactBounds = {
            south: bounds.getSouth(),
            north: bounds.getNorth(),
            west: bounds.getWest(),
            east: bounds.getEast()
          };
          return restaurant.location.lat >= exactBounds.south && restaurant.location.lat <= exactBounds.north && restaurant.location.lng >= exactBounds.west && restaurant.location.lng <= exactBounds.east;
        }).map((restaurant: any) => ({
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
        setRecommendations(filteredRecommendations);

        // Clear existing markers
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        // Add mobile-optimized markers
        filteredRecommendations.forEach((restaurant: Restaurant) => {
          if (restaurant.latitude && restaurant.longitude) {
            const marker = new mapboxgl.Marker({
              color: '#ef4444',
              scale: 0.8 // Slightly smaller for mobile
            }).setLngLat([restaurant.longitude, restaurant.latitude]).addTo(map.current!);

            // Mobile-optimized click handler - opens bottom sheet instead of popup
            marker.getElement().addEventListener('click', () => {
              setSelectedRestaurant(restaurant);
              setShowBottomSheet(true);
              setBottomSheetHeight('50%');
            });
            markers.current.push(marker);
          }
        });
        if (filteredRecommendations.length > 0) {
          setShowBottomSheet(true);
          setBottomSheetHeight('33%');
        }
      }
    } catch (error) {
      console.error('Error searching area:', error);
      toast.error('Failed to search area');
    } finally {
      setIsSearching(false);
    }
  };
  const toggleBottomSheetHeight = () => {
    setBottomSheetHeight(prev => prev === '33%' ? '75%' : '33%');
  };
  if (isLoading) {
    return <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3">Loading map...</span>
      </div>;
  }
  return <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-primary to-primary-glow border-b-2 border-primary/20 shadow-elegant p-6 flex items-center justify-between backdrop-blur-sm">
        <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
        <h1 className="font-semibold text-lg">Find Restaurants</h1>
        <div className="w-8" /> {/* Spacer for centering */}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Floating Search Button */}
        {showSearchButton && <Button onClick={searchArea} disabled={isSearching} className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 shadow-lg" size="sm">
            <SearchIcon className="h-4 w-4 mr-2" />
            {isSearching ? 'Searching...' : 'Search This Area'}
          </Button>}

        {/* Loading Overlay */}
        {isSearching && <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
            <Card className="p-4">
              <CardContent className="flex items-center space-x-3 p-0">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="font-medium">Finding restaurants...</span>
              </CardContent>
            </Card>
          </div>}

        {/* Price Range Info */}
        
      </div>

      {/* Mobile Bottom Sheet */}
      {showBottomSheet && <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-30 transition-all duration-300 ease-out" style={{
      height: bottomSheetHeight
    }}>
          {/* Bottom Sheet Handle */}
          <div className="flex justify-center py-3 cursor-pointer" onClick={toggleBottomSheetHeight}>
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>

          {/* Bottom Sheet Content */}
          <div className="px-4 pb-4 h-full overflow-hidden bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-sm">
            {selectedRestaurant ?
        // Individual Restaurant View
        <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <Button onClick={() => {
              setSelectedRestaurant(null);
              setBottomSheetHeight('33%');
            }} variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronUp className="h-4 w-4 rotate-90" />
                  </Button>
                  <h2 className="font-semibold text-lg truncate mx-2">{selectedRestaurant.name}</h2>
                  <div className="w-8" />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-4">
                    {/* Restaurant Header */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{selectedRestaurant.cuisine}</Badge>
                        <Badge variant="outline">{'$'.repeat(selectedRestaurant.priceRange || 1)}</Badge>
                        {selectedRestaurant.rating && <Badge variant="outline">
                            ⭐ {selectedRestaurant.rating.toFixed(1)}
                          </Badge>}
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{selectedRestaurant.address}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <Button onClick={() => window.open(selectedRestaurant.googleMapsUrl, '_blank')} className="w-full" size="sm">
                        <Navigation className="h-4 w-4 mr-2" />
                        Directions
                      </Button>
                      <Button onClick={() => onAddRestaurant({
                  ...selectedRestaurant,
                  userRating: 5
                })} variant="outline" className="w-full" size="sm">
                        Add to List
                      </Button>
                    </div>

                    {/* Photos */}
                    {selectedRestaurant.photos && selectedRestaurant.photos.length > 0 && <div>
                        <h3 className="font-medium mb-2">Photos</h3>
                        <ScrollArea className="w-full whitespace-nowrap">
                          <div className="flex space-x-2 pb-2">
                            {selectedRestaurant.photos.slice(0, 5).map((photo, index) => <img key={index} src={photo} alt={`${selectedRestaurant.name} photo ${index + 1}`} className="h-20 w-20 object-cover rounded-lg flex-shrink-0" />)}
                          </div>
                        </ScrollArea>
                      </div>}
                  </div>
                </ScrollArea>
              </div> :
        // Restaurant List View
        <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">
                    Found {recommendations.length} restaurants
                  </h2>
                  <Button onClick={toggleBottomSheetHeight} variant="ghost" size="sm">
                    <ChevronUp className={`h-4 w-4 transition-transform ${bottomSheetHeight === '75%' ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                {recommendations.length === 0 ? <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground text-center">
                      Move the map and tap "Search This Area" to find recommendations
                    </p>
                  </div> : <ScrollArea className="flex-1">
                    <div className="space-y-3">
                      {recommendations.map(restaurant => <Card key={restaurant.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                setSelectedRestaurant(restaurant);
                setBottomSheetHeight('50%');
              }}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium truncate">{restaurant.name}</h3>
                                <p className="text-sm text-muted-foreground truncate">{restaurant.address}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary" className="text-xs">{restaurant.cuisine}</Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {'$'.repeat(restaurant.priceRange || 1)}
                                  </Badge>
                                  {restaurant.rating && <span className="text-xs text-muted-foreground">
                                      ⭐ {restaurant.rating.toFixed(1)}
                                    </span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>)}
                    </div>
                  </ScrollArea>}
              </div>}
          </div>
        </div>}
    </div>;
}
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Restaurant } from '@/types/restaurant';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Settings, Satellite, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StarRating } from '@/components/StarRating';
import { Label } from '@/components/ui/label';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface MapViewProps {
  restaurants: Restaurant[];
  onRestaurantSelect: (id: string) => void;
}

type MapStyle = 'streets' | 'satellite' | 'hybrid';

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  hybrid: 'mapbox://styles/mapbox/satellite-streets-v12'
};

export function MapView({ restaurants, onRestaurantSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const { token, saveToken, isLoading } = useMapboxToken();

  // Filter restaurants by search term and ensure they have coordinates
  const filteredRestaurants = restaurants.filter(restaurant => {
    const hasCoordinates = restaurant.latitude != null && restaurant.longitude != null;
    const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
    
    console.log(`Restaurant ${restaurant.name}:`, {
      hasCoordinates,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      matchesSearch
    });
    
    return hasCoordinates && matchesSearch;
  });

  // Initialize map when token is available
  useEffect(() => {
    console.log('MapView effect - token:', !!token, 'isLoading:', isLoading, 'showTokenInput:', showTokenInput);
    
    // Don't show token input if we have a token or are loading
    if (token || isLoading) {
      setShowTokenInput(false);
    } else if (!token && !isLoading) {
      setShowTokenInput(true);
      return;
    }
    
    // Update input field with current token
    if (token) {
      setTokenInput(token);
    }

    // Don't reinitialize map if it already exists and token hasn't changed
    if (map.current || !mapContainer.current || !token) return;
    
    // Initialize map with token
    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: [-98.5795, 39.8283], // Center of the US by default
        zoom: 3,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setShowTokenInput(true);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      setShowTokenInput(true);
    }

    return () => {
      // Only clean up if component is unmounting, not just re-rendering
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [token, isLoading, mapStyle]);

  // Handle map style changes
  const handleStyleChange = (newStyle: MapStyle) => {
    if (!map.current || mapStyle === newStyle) return;
    
    setMapStyle(newStyle);
    map.current.setStyle(MAP_STYLES[newStyle]);
    
    // Re-add markers after style loads
    map.current.once('styledata', () => {
      // Markers should persist but let's ensure they're visible
      Object.values(markers.current).forEach(marker => {
        if (marker.getElement()) {
          marker.addTo(map.current!);
        }
      });
    });
  };

  // Add/update markers for restaurants
  useEffect(() => {
    console.log('MapView: Restaurants changed, total:', restaurants.length, 'filtered:', filteredRestaurants.length);
    
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Don't add markers if we don't have restaurants with coordinates
    if (filteredRestaurants.length === 0) return;

    // Add new markers
    filteredRestaurants.forEach(restaurant => {
      if (restaurant.latitude && restaurant.longitude) {
        // Create marker element
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23${restaurant.isWishlist ? '4caf50' : 'e91e63'}" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>')`;
        el.style.backgroundSize = '100%';
        el.style.cursor = 'pointer';

        // Create and add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([restaurant.longitude, restaurant.latitude])
          .addTo(map.current!);

        marker.getElement().addEventListener('click', () => {
          setSelectedRestaurant(restaurant);
          map.current?.flyTo({
            center: [restaurant.longitude, restaurant.latitude],
            zoom: 14,
            essential: true
          });
        });

        markers.current[restaurant.id] = marker;
      }
    });

    // Fit map to show all markers if there are any
    if (filteredRestaurants.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      filteredRestaurants.forEach(restaurant => {
        if (restaurant.latitude && restaurant.longitude) {
          bounds.extend([restaurant.longitude, restaurant.latitude]);
        }
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
      }
    }
  }, [filteredRestaurants, mapLoaded]);

  const handleSaveToken = async () => {
    await saveToken(tokenInput);
  };

  return (
    <div className="h-full w-full">
      {showTokenInput && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 text-center">
              <Settings className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Mapbox Setup Required</h3>
              <p className="text-sm text-muted-foreground">
                Enter your Mapbox public token to view the map
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mapbox-token">Mapbox Public Token</Label>
                <Input
                  id="mapbox-token"
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="pk.ey..."
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Get your token from{" "}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  mapbox.com
                </a>
              </div>
              <Button 
                onClick={handleSaveToken}
                disabled={!tokenInput || isLoading}
                className="w-full"
              >
                {isLoading ? 'Saving...' : 'Load Map'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Search bar */}
      <div className="absolute left-4 top-4 z-10 w-80 max-w-[calc(100vw-8rem)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search restaurants..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Map style toggle */}
      <div className="absolute left-4 top-16 z-10">
        <div className="flex rounded-md bg-card shadow-lg border">
          <Button
            variant={mapStyle === 'streets' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleStyleChange('streets')}
            className="rounded-r-none border-r"
            title="Streets View"
          >
            <Map className="h-4 w-4" />
          </Button>
          <Button
            variant={mapStyle === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleStyleChange('satellite')}
            className="rounded-none border-r"
            title="Satellite View"
          >
            <Satellite className="h-4 w-4" />
          </Button>
          <Button
            variant={mapStyle === 'hybrid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleStyleChange('hybrid')}
            className="rounded-l-none"
            title="Hybrid View"
          >
            <Satellite className="h-4 w-4 mr-1" />
            <Map className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {selectedRestaurant && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg bg-card p-4 shadow-lg md:left-auto md:right-4 md:w-96">
          <div className="mb-3 flex flex-col gap-2">
            <h3 className="font-semibold text-lg leading-tight">{selectedRestaurant.name}</h3>
            {selectedRestaurant.rating && (
              <div className="flex items-center">
                <StarRating rating={selectedRestaurant.rating} readonly size="sm" />
              </div>
            )}
          </div>
          
          <div className="mb-2 flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
            <span className="break-words">{selectedRestaurant.address}, {selectedRestaurant.city}</span>
          </div>
          
          <div className="mb-2 text-sm">
            <span className="font-medium">Cuisine:</span> {selectedRestaurant.cuisine}
          </div>
          
          {selectedRestaurant.notes && (
            <div className="mb-3 line-clamp-2 text-sm">
              <span className="font-medium">Notes:</span> {selectedRestaurant.notes}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => onRestaurantSelect(selectedRestaurant.id)} 
              size="sm" 
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRestaurant(null)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
      
      <div 
        ref={mapContainer} 
        className="h-full w-full"
      >
        {!mapLoaded && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="space-y-4">
              <Skeleton className="h-[200px] w-[400px] rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[400px]" />
                <Skeleton className="h-4 w-[350px]" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <style>
        {`
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
        .mapboxgl-ctrl-attrib {
          font-size: 10px !important;
        }
        `}
      </style>
    </div>
  );
}

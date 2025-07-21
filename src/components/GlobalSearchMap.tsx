import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings, Satellite, Map } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GlobalSearchMapProps {
  restaurants: GooglePlaceResult[];
  onRestaurantClick: (restaurant: GooglePlaceResult) => void;
  center?: { lat: number; lng: number };
}

type MapStyle = 'streets' | 'satellite' | 'hybrid';

const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  hybrid: 'mapbox://styles/mapbox/satellite-streets-v12'
};

const getMarkerColor = (rating?: number): string => {
  if (!rating) return 'e91e63'; // red for no rating
  if (rating <= 3) return 'e91e63'; // red for low rating
  if (rating <= 4) return 'ff9800'; // orange for medium rating
  if (rating <= 4.5) return '4caf50'; // green for good rating
  return 'ffd700'; // gold for excellent rating
};

export function GlobalSearchMap({ restaurants, onRestaurantClick, center }: GlobalSearchMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<GooglePlaceResult | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [tokenInput, setTokenInput] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  const { token, saveToken, isLoading } = useMapboxToken();

  // Initialize map when token is available
  useEffect(() => {
    if (token || isLoading) {
      setShowTokenInput(false);
    } else if (!token && !isLoading) {
      setShowTokenInput(true);
      return;
    }
    
    if (token) {
      setTokenInput(token);
    }

    if (map.current || !mapContainer.current || !token) return;
    
    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: center ? [center.lng, center.lat] : [-98.5795, 39.8283],
        zoom: center ? 12 : 3,
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
    
    map.current.once('styledata', () => {
      Object.values(markers.current).forEach(marker => {
        if (marker.getElement()) {
          marker.addTo(map.current!);
        }
      });
    });
  };

  // Add/update markers for restaurants
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    if (restaurants.length === 0) return;

    // Add new markers
    restaurants.forEach(restaurant => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '24px';
      el.style.height = '24px';
      
      const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23${getMarkerColor(restaurant.rating)}" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      
      el.style.backgroundImage = `url('data:image/svg+xml;utf8,${iconSvg}')`;
      el.style.backgroundSize = '100%';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker(el)
        .setLngLat([restaurant.geometry.location.lng, restaurant.geometry.location.lat])
        .addTo(map.current!);

      marker.getElement().addEventListener('click', () => {
        setSelectedRestaurant(restaurant);
        onRestaurantClick(restaurant);
        map.current?.flyTo({
          center: [restaurant.geometry.location.lng, restaurant.geometry.location.lat],
          zoom: 16,
          essential: true
        });
      });

      markers.current[restaurant.place_id] = marker;
    });

    // Fit map to show all markers
    if (restaurants.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      restaurants.forEach(restaurant => {
        bounds.extend([restaurant.geometry.location.lng, restaurant.geometry.location.lat]);
      });
      
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15
        });
      }
    }
  }, [restaurants, mapLoaded, onRestaurantClick]);

  const handleSaveToken = async () => {
    await saveToken(tokenInput);
  };

  return (
    <div className="h-full w-full relative">
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

      {/* Map style toggle */}
      <div className="absolute left-4 top-4 z-10">
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
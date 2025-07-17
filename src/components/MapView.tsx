import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Restaurant } from '@/types/restaurant';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { StarRating } from '@/components/StarRating';

mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbHhtZ3V1cjAwMTdjMmtzMDNrNjVrbzRtIn0.ZtSlpKA9nra05HPsSCTOhQ';

interface MapViewProps {
  restaurants: Restaurant[];
  onRestaurantSelect: (id: string) => void;
}

export function MapView({ restaurants, onRestaurantSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter restaurants by search term
  const filteredRestaurants = restaurants.filter(restaurant => 
    restaurant.latitude && restaurant.longitude && (
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5795, 39.8283], // Center of the US by default
      zoom: 3,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers for restaurants
  useEffect(() => {
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

  return (
    <div className="h-full w-full">
      <div className="absolute left-4 right-4 top-4 z-10 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search restaurants..."
            className="pl-10"
          />
        </div>
      </div>

      {selectedRestaurant && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg bg-card p-4 shadow-lg md:left-auto md:right-4 md:w-80">
          <div className="mb-2 flex items-start justify-between">
            <h3 className="font-semibold">{selectedRestaurant.name}</h3>
            {selectedRestaurant.rating && (
              <StarRating rating={selectedRestaurant.rating} readonly size="sm" />
            )}
          </div>
          
          <div className="mb-2 flex items-center text-sm text-muted-foreground">
            <MapPin className="mr-1 h-3.5 w-3.5" />
            {selectedRestaurant.address}, {selectedRestaurant.city}
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
              className="w-full"
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
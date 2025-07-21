import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Skeleton } from '@/components/ui/skeleton';
import { useMapboxToken } from '@/hooks/useMapboxToken';

interface RestaurantLocationMapProps {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export function RestaurantLocationMap({ latitude, longitude, name, address }: RestaurantLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { token, isLoading } = useMapboxToken();

  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [longitude, latitude],
        zoom: 15,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add marker for restaurant
      const marker = new mapboxgl.Marker({
        color: '#ef4444' // red marker
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);

      // Add popup with restaurant info
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div class="p-2">
            <h3 class="font-semibold text-sm">${name}</h3>
            <p class="text-xs text-gray-600 mt-1">${address}</p>
          </div>
        `);

      marker.setPopup(popup);

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, [token, latitude, longitude, name, address]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-lg" />;
  }

  if (!token) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Map not available</p>
          <p className="text-xs mt-1">Mapbox token required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 w-full rounded-lg overflow-hidden">
      <div ref={mapContainer} className="h-full w-full">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Skeleton className="h-full w-full" />
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
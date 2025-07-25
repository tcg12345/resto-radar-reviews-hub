import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Map, Layers } from 'lucide-react';

interface PlaceRating {
  id: string;
  place_name: string;
  place_type: string;
  latitude?: number;
  longitude?: number;
  overall_rating?: number;
  address?: string;
}

interface TripMapViewProps {
  ratings: PlaceRating[];
  selectedPlaceId: string | null;
  onPlaceSelect: (placeId: string) => void;
}

export function TripMapView({ ratings, selectedPlaceId, onPlaceSelect }: TripMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const { token } = useMapboxToken();
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12');

  const mapStyles = [
    { id: 'mapbox://styles/mapbox/satellite-streets-v12', name: 'Satellite Streets', icon: '🛰️' },
    { id: 'mapbox://styles/mapbox/streets-v12', name: 'Streets', icon: '🗺️' },
    { id: 'mapbox://styles/mapbox/light-v11', name: 'Light', icon: '☀️' },
    { id: 'mapbox://styles/mapbox/dark-v11', name: 'Dark', icon: '🌙' },
    { id: 'mapbox://styles/mapbox/outdoors-v12', name: 'Outdoors', icon: '🏔️' },
  ];

  useEffect(() => {
    if (!mapContainer.current || !token) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [-74.006, 40.7128], // Default to NYC
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [token, mapStyle]);

  const changeMapStyle = (styleId: string) => {
    if (map.current) {
      map.current.setStyle(styleId);
      setMapStyle(styleId);
    }
  };

  useEffect(() => {
    if (!map.current || !ratings.length) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidCoordinates = false;

    ratings.forEach((rating) => {
      if (rating.latitude && rating.longitude) {
        hasValidCoordinates = true;
        bounds.extend([rating.longitude, rating.latitude]);

        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = `
          w-8 h-8 rounded-full border-2 cursor-pointer transition-all
          ${selectedPlaceId === rating.id 
            ? 'bg-primary border-primary-foreground scale-110 shadow-lg' 
            : 'bg-background border-primary hover:scale-105'
          }
        `;
        markerElement.innerHTML = `
          <div class="w-full h-full flex items-center justify-center text-xs font-bold">
            ${rating.overall_rating || '?'}
          </div>
        `;

        markerElement.addEventListener('click', () => {
          onPlaceSelect(rating.id);
        });

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([rating.longitude, rating.latitude])
          .addTo(map.current!);

        // Add popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${rating.place_name}</h3>
              <p class="text-xs text-gray-600">${rating.place_type}</p>
              ${rating.overall_rating ? `<p class="text-xs">★ ${rating.overall_rating}/10</p>` : ''}
              ${rating.address ? `<p class="text-xs text-gray-500">${rating.address}</p>` : ''}
            </div>
          `);

        marker.setPopup(popup);
        markers.current.push(marker);
      }
    });

    // Fit map to bounds if we have valid coordinates
    if (hasValidCoordinates && ratings.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [ratings, selectedPlaceId, onPlaceSelect]);

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Map requires Mapbox token</p>
          <p className="text-xs text-muted-foreground">Configure your Mapbox token in settings</p>
        </div>
      </div>
    );
  }

  if (ratings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="text-center">
          <h3 className="font-medium text-foreground mb-2">No places to show</h3>
          <p className="text-sm text-muted-foreground">
            Add places with locations to see them on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Style Selector */}
      <div className="absolute top-4 right-16 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-background/95 backdrop-blur-sm shadow-lg">
              <Layers className="w-4 h-4 mr-2" />
              Map Style
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
            {mapStyles.map((style) => (
              <DropdownMenuItem
                key={style.id}
                onClick={() => changeMapStyle(style.id)}
                className={mapStyle === style.id ? 'bg-accent' : ''}
              >
                <span className="mr-2">{style.icon}</span>
                {style.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Map overlay info */}
      <div className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
          <Map className="w-4 h-4" />
          Trip Map
        </h3>
        <p className="text-xs text-muted-foreground">
          {ratings.filter(r => r.latitude && r.longitude).length} of {ratings.length} places have locations
        </p>
      </div>
    </div>
  );
}
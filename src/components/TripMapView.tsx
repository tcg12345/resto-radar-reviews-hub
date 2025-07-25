import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Map, 
  Layers, 
  Utensils, 
  Building2, 
  Camera, 
  Dumbbell, 
  Music, 
  ShoppingBag, 
  TreePine, 
  MapPin,
  Plane,
  Car,
  Mountain,
  Waves,
  Landmark,
  Coffee
} from 'lucide-react';

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

  // Function to get icon based on place type
  const getPlaceIcon = (placeType: string): string => {
    const type = placeType.toLowerCase();
    
    // Hotels and accommodation
    if (type.includes('hotel') || type.includes('accommodation') || type.includes('lodge') || type.includes('resort')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3h5a1 1 0 0 1 1 1v13M9 21v-9h4v9"/></svg>';
    }
    
    // Restaurants, cafes, food
    if (type.includes('restaurant') || type.includes('cafe') || type.includes('food') || type.includes('dining') || type.includes('bar') || type.includes('coffee')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 11 4-4v3a6 6 0 0 1-6 6H4a6 6 0 0 1-6-6v-3l4 4"/><path d="M6 7 8 5l2 2"/><path d="m8 13 2-2"/></svg>';
    }
    
    // Museums, galleries, cultural sites
    if (type.includes('museum') || type.includes('gallery') || type.includes('cultural') || type.includes('historic') || type.includes('monument') || type.includes('landmark')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 14.2 0L21 21"/><path d="m12 13-1-1 2-2-1-1"/></svg>';
    }
    
    // Sports and fitness
    if (type.includes('sport') || type.includes('gym') || type.includes('fitness') || type.includes('stadium') || type.includes('arena')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>';
    }
    
    // Entertainment, music, theaters
    if (type.includes('music') || type.includes('theater') || type.includes('entertainment') || type.includes('concert') || type.includes('cinema')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    }
    
    // Shopping
    if (type.includes('shop') || type.includes('store') || type.includes('market') || type.includes('mall')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="m16 10a4 4 0 0 1-8 0"/></svg>';
    }
    
    // Nature, parks, outdoors
    if (type.includes('park') || type.includes('nature') || type.includes('garden') || type.includes('outdoor') || type.includes('beach') || type.includes('mountain')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L11 4h2l3 3.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22V4"/></svg>';
    }
    
    // Transportation
    if (type.includes('airport') || type.includes('transport') || type.includes('station')) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>';
    }
    
    // Default icon for other types
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  };

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

        // Create custom marker element with pin design
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-map-marker';
        
        const isSelected = selectedPlaceId === rating.id;
        
        markerElement.innerHTML = `
          <div class="marker-pin ${isSelected ? 'selected' : ''}">
            <div class="marker-content">
              <div class="marker-icon">${getPlaceIcon(rating.place_type)}</div>
            </div>
            <div class="marker-point"></div>
          </div>
        `;

        // Add click handler
        markerElement.addEventListener('click', () => {
          onPlaceSelect(rating.id);
        });

        // Create marker with proper anchor
        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'bottom' // Anchor at the bottom point of the pin
        })
          .setLngLat([rating.longitude, rating.latitude])
          .addTo(map.current!);

        // Add popup with hover
        const popup = new mapboxgl.Popup({ 
          offset: [0, -40], // Offset above the marker
          closeButton: false,
          closeOnClick: false
        })
          .setHTML(`
            <div class="marker-popup">
              <h3 class="popup-title">${rating.place_name}</h3>
              <p class="popup-type">${rating.place_type}</p>
              ${rating.overall_rating ? `<p class="popup-rating">★ ${rating.overall_rating}/10</p>` : ''}
              ${rating.address ? `<p class="popup-address">${rating.address}</p>` : ''}
            </div>
          `);

        // Show popup on hover
        markerElement.addEventListener('mouseenter', () => {
          popup.addTo(map.current!);
          marker.setPopup(popup);
          popup.addTo(map.current!);
        });

        markerElement.addEventListener('mouseleave', () => {
          popup.remove();
        });

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
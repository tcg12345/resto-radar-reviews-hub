import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Map, 
  Layers, 
  Utensils, 
  Bed, 
  TreePine, 
  ShoppingCart, 
  FerrisWheel,
  MapPin
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

export interface TripMapViewRef {
  zoomToPlace: (placeId: string) => void;
}

export const TripMapView = forwardRef<TripMapViewRef, TripMapViewProps>(({ ratings, selectedPlaceId, onPlaceSelect }, ref) => {
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

  // Function to zoom to a specific place
  const zoomToPlace = (placeId: string) => {
    const place = ratings.find(r => r.id === placeId);
    if (place && place.latitude && place.longitude && map.current) {
      map.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 16,
        duration: 1000
      });
      onPlaceSelect(placeId);
    }
  };

  // Function to create icon SVG based on place type
  const createIconSVG = (placeType: string): string => {
    const type = placeType.toLowerCase();
    const iconColor = 'white';
    const iconSize = 14;
    
    // Hotels and accommodation - Bed icon
    if (type.includes('hotel') || type.includes('accommodation') || type.includes('lodge') || type.includes('resort')) {
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/></svg>`;
    }
    
    // Restaurants, cafes, food - Utensils icon
    if (type.includes('restaurant') || type.includes('cafe') || type.includes('food') || type.includes('dining') || type.includes('bar') || type.includes('coffee')) {
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`;
    }
    
    // Museums, galleries, cultural sites - Museum/Landmark icon
    if (type.includes('museum') || type.includes('gallery') || type.includes('cultural') || type.includes('historic') || type.includes('monument') || type.includes('landmark')) {
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 14.2 0L21 21"/><path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M5 21h14"/><path d="M6 21v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>`;
    }
    
    // Shopping - ShoppingCart icon
    if (type.includes('shop') || type.includes('store') || type.includes('market') || type.includes('mall') || type.includes('shopping')) {
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
    }
    
    // Nature, parks, outdoors - TreePine icon
    if (type.includes('park') || type.includes('nature') || type.includes('garden') || type.includes('outdoor') || type.includes('beach') || type.includes('mountain')) {
      return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L11 4h2l3 3.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22V4"/></svg>`;
    }
    
    // Default icon for other attractions - FerrisWheel icon
    return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 2v4"/><path d="m6.8 6.8 2.8 2.8"/><path d="M2 12h4"/><path d="m6.8 17.2 2.8-2.8"/><path d="M12 18v4"/><path d="m17.2 17.2-2.8-2.8"/><path d="M22 12h-4"/><path d="m17.2 6.8-2.8 2.8"/></svg>`;
  };

  // Expose the zoomToPlace function via ref
  useImperativeHandle(ref, () => ({
    zoomToPlace
  }));

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

    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (map.current) {
        // Trigger map resize when container size changes
        map.current.resize();
      }
    });

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      resizeObserver.disconnect();
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
              <div class="marker-icon">${createIconSVG(rating.place_type)}</div>
            </div>
            <div class="marker-point"></div>
          </div>
        `;

        // Add click handler to zoom and select
        markerElement.addEventListener('click', () => {
          zoomToPlace(rating.id);
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
      
    </div>
  );
});
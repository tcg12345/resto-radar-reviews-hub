import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ItineraryEvent } from './ItineraryBuilder';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { MapPin, Calendar, Clock, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface ItineraryMapViewProps {
  events: ItineraryEvent[];
  isOpen: boolean;
  onClose: () => void;
}

const getEventTypeIcon = (type: string) => {
  switch (type) {
    case 'restaurant': return '🍽️';
    case 'hotel': return '🏨';
    case 'attraction': return '🎯';
    case 'museum': return '🏛️';
    case 'park': return '🌳';
    case 'monument': return '🗿';
    case 'shopping': return '🛍️';
    case 'entertainment': return '🎭';
    default: return '📍';
  }
};

const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'restaurant': return '#FF6B6B';
    case 'hotel': return '#4ECDC4';
    case 'attraction': return '#45B7D1';
    case 'museum': return '#96CEB4';
    case 'park': return '#FCEA2B';
    case 'monument': return '#FF9FF3';
    case 'shopping': return '#54A0FF';
    case 'entertainment': return '#5F27CD';
    default: return '#6C5CE7';
  }
};

export function ItineraryMapView({ events, isOpen, onClose }: ItineraryMapViewProps) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const { token, isLoading } = useMapboxToken();
  const [selectedEvent, setSelectedEvent] = useState<ItineraryEvent | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter events that have location data
  const eventsWithLocation = events.filter(event => {
    const hasAttractionCoords = event.attractionData?.latitude && event.attractionData?.longitude;
    const hasRestaurantCoords = event.restaurantData?.latitude && event.restaurantData?.longitude;
    const hasRestaurantPlaceId = event.restaurantData?.placeId;
    
    console.log('Event filtering:', {
      title: event.title,
      type: event.type,
      hasAttractionCoords,
      hasRestaurantCoords,
      hasRestaurantPlaceId,
      attractionData: event.attractionData,
      restaurantData: event.restaurantData
    });
    
    return hasAttractionCoords || hasRestaurantCoords || hasRestaurantPlaceId;
  });

  useEffect(() => {
    if (!isOpen || !token || !mapContainer.current || eventsWithLocation.length === 0) {
      setMapLoaded(false);
      return;
    }

    // Initialize map
    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-74.006, 40.7128], // Default to NYC
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // Wait for map to load before allowing markers
    map.current.on('load', () => {
      console.log('Map loaded successfully');
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapLoaded(false);
    };
  }, [isOpen, token, eventsWithLocation.length]);

  useEffect(() => {
    // Only add markers after map is loaded and we have events
    if (!map.current || !mapLoaded || eventsWithLocation.length === 0) {
      console.log('Skipping marker creation:', { 
        hasMap: !!map.current, 
        mapLoaded, 
        eventCount: eventsWithLocation.length 
      });
      return;
    }

    console.log('Creating markers for', eventsWithLocation.length, 'events');

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let validBounds = false;

    eventsWithLocation.forEach((event) => {
      let lat: number | undefined;
      let lng: number | undefined;

      // Check if we have direct coordinates from attraction data
      if (event.attractionData?.latitude && event.attractionData?.longitude) {
        lat = event.attractionData.latitude;
        lng = event.attractionData.longitude;
      } 
      // Check if we have coordinates from restaurant data
      else if (event.restaurantData?.latitude && event.restaurantData?.longitude) {
        lat = event.restaurantData.latitude;
        lng = event.restaurantData.longitude;
      }
      // If we have a restaurant with place ID but no coordinates, skip for now
      else if (event.restaurantData?.placeId) {
        console.log('Found restaurant with place ID but no coordinates:', event.restaurantData.placeId);
        return;
      }

      if (lat && lng) {
        validBounds = true;
        bounds.extend([lng, lat]);

        // Create custom marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'itinerary-marker';
        markerElement.innerHTML = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg cursor-pointer transition-all hover:scale-110" 
               style="background-color: ${getEventTypeColor(event.type)}; border: 3px solid white;">
            <span class="text-sm">${getEventTypeIcon(event.type)}</span>
          </div>
        `;

        markerElement.addEventListener('click', () => {
          setSelectedEvent(event);
          if (map.current) {
            map.current.flyTo({
              center: [lng, lat],
              zoom: 15,
              essential: true
            });
          }
        });

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([lng, lat]);
        
        // Safety check before adding to map
        if (map.current) {
          marker.addTo(map.current);
          markers.current.push(marker);
        }
      }
    });

    // Fit map to show all markers
    if (validBounds && !bounds.isEmpty() && map.current) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    }
  }, [eventsWithLocation, mapLoaded]);

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <span className="text-sm text-muted-foreground">Loading map...</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Map Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unable to load the map at this time. Please try again later.
            </p>
            <Button onClick={onClose} className="w-full mt-4">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventsWithLocation.length === 0) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              No Locations Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add some attractions or restaurants with location data to see them on the map.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="relative w-full h-full">
        {/* Map Container */}
        <div ref={mapContainer} className="w-full h-full" />
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-background/90 to-transparent">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Itinerary Map
              <Badge variant="secondary" className="ml-2">
                {eventsWithLocation.length} location{eventsWithLocation.length !== 1 ? 's' : ''}
              </Badge>
            </h2>
        </div>

        {/* Selected Event Details */}
        {selectedEvent && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:w-80">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">{getEventTypeIcon(selectedEvent.type)}</span>
                  {selectedEvent.title}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {selectedEvent.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedEvent.time}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedEvent.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedEvent.description}
                  </p>
                )}
                {selectedEvent.attractionData?.address && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEvent.attractionData.address}
                  </p>
                )}
                {selectedEvent.restaurantData?.address && (
                  <p className="text-xs text-muted-foreground">
                    {selectedEvent.restaurantData.address}
                  </p>
                 )}
                 <div className="flex gap-2 mt-3">
                   {selectedEvent.type === 'restaurant' && selectedEvent.restaurantData?.placeId && (
                     <Button 
                       variant="default" 
                       size="sm" 
                       className="flex-1"
                       onClick={() => {
                         navigate(`/restaurant/${selectedEvent.restaurantData?.placeId}`);
                       }}
                     >
                       <Eye className="w-3 h-3 mr-1" />
                       View Details
                     </Button>
                   )}
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className={selectedEvent.type === 'restaurant' && selectedEvent.restaurantData?.placeId ? "flex-1" : "w-full"}
                     onClick={() => setSelectedEvent(null)}
                   >
                     Close
                   </Button>
                 </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Legend */}
        <div className="absolute top-20 right-4 hidden lg:block">
          <Card className="w-48">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Legend</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {Array.from(new Set(eventsWithLocation.map(e => e.type))).map(type => (
                <div key={type} className="flex items-center gap-2 text-xs">
                   <div 
                     className="w-3 h-3 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: getEventTypeColor(type) }}
                  >
                    <span className="text-[8px]">{getEventTypeIcon(type)}</span>
                  </div>
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
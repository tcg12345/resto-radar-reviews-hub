import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ItineraryEvent } from './ItineraryBuilder';
import { Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { MapPin, Calendar, Clock, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface HotelBooking {
  id: string;
  hotel: HotelType;
  checkIn?: Date;
  checkOut?: Date;
  location?: string;
}

interface ItineraryMapViewProps {
  events: ItineraryEvent[];
  hotels?: HotelBooking[];
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
    case 'other': return '📍';
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

export function ItineraryMapView({ events, hotels = [], isOpen, onClose }: ItineraryMapViewProps) {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const { token, isLoading } = useMapboxToken();
  const [selectedEvent, setSelectedEvent] = useState<ItineraryEvent | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelBooking | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Filter events that have location data
  const eventsWithLocation = events.filter(event => {
    const hasAttractionCoords = event.attractionData?.latitude && event.attractionData?.longitude;
    const hasRestaurantCoords = event.restaurantData?.latitude && event.restaurantData?.longitude;
    const hasAddress = event.attractionData?.address || event.restaurantData?.address;
    
    console.log('Event filtering:', {
      title: event.title,
      type: event.type,
      hasAttractionCoords,
      hasRestaurantCoords,
      hasAddress,
      attractionData: event.attractionData,
      restaurantData: event.restaurantData
    });
    
    // Include events that have coordinates OR at least an address
    return hasAttractionCoords || hasRestaurantCoords || hasAddress;
  });

  // Filter hotels that have location data
  const hotelsWithLocation = hotels.filter(hotelBooking => {
    const hasCoords = hotelBooking.hotel.latitude && hotelBooking.hotel.longitude;
    console.log('Hotel filtering:', {
      name: hotelBooking.hotel.name,
      hasCoords,
      latitude: hotelBooking.hotel.latitude,
      longitude: hotelBooking.hotel.longitude
    });
    return hasCoords;
  });

  const totalLocations = eventsWithLocation.length + hotelsWithLocation.length;

  useEffect(() => {
    if (!isOpen || !token || !mapContainer.current || totalLocations === 0) {
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
  }, [isOpen, token, totalLocations]);

  useEffect(() => {
    // Only add markers after map is loaded and we have locations
    if (!map.current || !mapLoaded || totalLocations === 0) {
      console.log('Skipping marker creation:', { 
        hasMap: !!map.current, 
        mapLoaded, 
        totalLocations 
      });
      return;
    }

    console.log('Creating markers for', eventsWithLocation.length, 'events and', hotelsWithLocation.length, 'hotels');

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let validBounds = false;

    eventsWithLocation.forEach((event) => {
      let lat: number | undefined;
      let lng: number | undefined;
      let eventType = event.type;

      // Determine coordinates and event type
      if (event.attractionData?.latitude && event.attractionData?.longitude) {
        lat = event.attractionData.latitude;
        lng = event.attractionData.longitude;
        // Use the placeType from attractionData if available, otherwise use event.type
        eventType = event.attractionData.placeType || event.type;
      } 
      else if (event.restaurantData?.latitude && event.restaurantData?.longitude) {
        lat = event.restaurantData.latitude;
        lng = event.restaurantData.longitude;
        eventType = 'restaurant';
      }
      // Skip events without coordinates for now
      else {
        console.log('Skipping event without coordinates:', {
          title: event.title,
          type: event.type,
          hasAddress: event.attractionData?.address || event.restaurantData?.address
        });
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
               style="background-color: ${getEventTypeColor(eventType)}; border: 3px solid white;">
            <span class="text-sm">${getEventTypeIcon(eventType)}</span>
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

    // Add hotel markers
    hotelsWithLocation.forEach((hotelBooking) => {
      const { hotel } = hotelBooking;
      
      if (hotel.latitude && hotel.longitude) {
        validBounds = true;
        bounds.extend([hotel.longitude, hotel.latitude]);

        // Create custom hotel marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'itinerary-marker hotel-marker';
        markerElement.innerHTML = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full shadow-lg cursor-pointer transition-all hover:scale-110" 
               style="background-color: ${getEventTypeColor('hotel')}; border: 3px solid white;">
            <span class="text-sm">${getEventTypeIcon('hotel')}</span>
          </div>
        `;

        markerElement.addEventListener('click', () => {
          setSelectedHotel(hotelBooking);
          setSelectedEvent(null); // Clear event selection
          if (map.current) {
            map.current.flyTo({
              center: [hotel.longitude!, hotel.latitude!],
              zoom: 15,
              essential: true
            });
          }
        });

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat([hotel.longitude, hotel.latitude]);
        
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
  }, [eventsWithLocation, hotelsWithLocation, mapLoaded]);

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

  if (totalLocations === 0) {
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
              Add some attractions, restaurants, or hotels with location data to see them on the map.
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
        <div className="absolute inset-x-0 top-0 px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-4 bg-gradient-to-b from-background/30 to-transparent">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Itinerary Map
              <Badge variant="secondary" className="ml-2">
                {totalLocations} location{totalLocations !== 1 ? 's' : ''}
              </Badge>
            </h2>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
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

        {/* Selected Hotel Details */}
        {selectedHotel && (
          <div className="absolute bottom-4 left-4 right-4 lg:left-auto lg:w-80">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-lg">🏨</span>
                  {selectedHotel.hotel.name}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {selectedHotel.checkIn && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Check-in: {selectedHotel.checkIn instanceof Date ? selectedHotel.checkIn.toLocaleDateString() : selectedHotel.checkIn}
                    </div>
                  )}
                  {selectedHotel.checkOut && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Check-out: {selectedHotel.checkOut instanceof Date ? selectedHotel.checkOut.toLocaleDateString() : selectedHotel.checkOut}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {selectedHotel.hotel.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedHotel.hotel.description}
                  </p>
                )}
                {selectedHotel.hotel.address && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {selectedHotel.hotel.address}
                  </p>
                )}
                {selectedHotel.hotel.rating && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Rating: {selectedHotel.hotel.rating}/5
                  </p>
                )}
                {selectedHotel.hotel.priceRange && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Price: {selectedHotel.hotel.priceRange}
                  </p>
                )}
                <div className="flex gap-2 mt-3">
                  {selectedHotel.hotel.website && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        window.open(selectedHotel.hotel.website, '_blank');
                      }}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Visit Website
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={selectedHotel.hotel.website ? "flex-1" : "w-full"}
                    onClick={() => setSelectedHotel(null)}
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
              {Array.from(new Set([
                ...eventsWithLocation.map(e => e.type),
                ...(hotelsWithLocation.length > 0 ? ['hotel'] : [])
              ])).map(type => (
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
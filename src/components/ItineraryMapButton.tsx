import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ItineraryEvent } from './ItineraryBuilder';
import { useIsMobile } from '@/hooks/useIsMobile';

interface ItineraryMapButtonProps {
  events: ItineraryEvent[];
  onOpenMap: () => void;
}

export function ItineraryMapButton({ events, onOpenMap }: ItineraryMapButtonProps) {
  const isMobile = useIsMobile();
  
  // Filter events that have location data
  const eventsWithLocation = events.filter(event => {
    const hasAttractionCoords = event.attractionData?.latitude && event.attractionData?.longitude;
    const hasRestaurantPlaceId = event.restaurantData?.placeId;
    return hasAttractionCoords || hasRestaurantPlaceId;
  });

  console.log('ItineraryMapButton Debug:', { 
    totalEvents: events.length, 
    eventsWithLocation: eventsWithLocation.length,
    isMobile,
    eventDetails: events.map(e => ({ 
      title: e.title, 
      type: e.type, 
      attractionData: e.attractionData,
      restaurantData: e.restaurantData,
      hasAttractionCoords: !!(e.attractionData?.latitude && e.attractionData?.longitude),
      hasRestaurantPlaceId: !!e.restaurantData?.placeId
    }))
  });

  // Always show button for debugging - remove this later
  // if (eventsWithLocation.length === 0) return null;

  if (isMobile) {
    return (
      <div className="fixed bottom-26 left-1/2 transform -translate-x-1/2 z-40">
        <Button 
          onClick={onOpenMap}
          className="h-8 px-3 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 text-xs"
        >
          <MapPin className="w-3 h-3 mr-1" />
          View Map ({eventsWithLocation.length > 0 ? eventsWithLocation.length : 'No locations'})
        </Button>
      </div>
    );
  }

  // Desktop version - inline button
  return (
    <Button 
      onClick={onOpenMap}
      variant="outline"
      className="w-full h-12"
    >
      <MapPin className="w-5 h-5 mr-2" />
      View Itinerary Map ({eventsWithLocation.length > 0 ? `${eventsWithLocation.length} location${eventsWithLocation.length !== 1 ? 's' : ''}` : 'No locations yet'})
    </Button>
  );
}
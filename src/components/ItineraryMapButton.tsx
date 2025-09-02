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

  if (eventsWithLocation.length === 0) return null;

  // Make the button sticky at the bottom for all screen sizes
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+20px)] left-1/2 transform -translate-x-1/2 z-50">
      <Button 
        onClick={onOpenMap}
        className="h-10 px-4 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105 text-sm font-medium"
      >
        <MapPin className="w-4 h-4 mr-2" />
        View Map ({eventsWithLocation.length})
      </Button>
    </div>
  );

}
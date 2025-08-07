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
    return (event.attractionData?.latitude && event.attractionData?.longitude) ||
           (event.restaurantData?.placeId);
  });

  // Don't show if no locations
  if (eventsWithLocation.length === 0) return null;

  if (isMobile) {
    return (
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-40">
        <Button 
          onClick={onOpenMap}
          className="h-12 px-6 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-105"
        >
          <MapPin className="w-5 h-5 mr-2" />
          View Map ({eventsWithLocation.length})
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
      View Itinerary Map ({eventsWithLocation.length} location{eventsWithLocation.length !== 1 ? 's' : ''})
    </Button>
  );
}
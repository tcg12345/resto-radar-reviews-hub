import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, MapPin, Plus, Star, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileTripPlaceCard } from './MobileTripPlaceCard';

interface PlaceRating {
  id: string;
  place_name: string;
  place_type: string;
  address?: string;
  overall_rating?: number;
  category_ratings?: any;
  date_visited?: string;
  notes?: string;
  photos?: string[];
  price_range?: number;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
}

interface MobileTripSwipePanelProps {
  places: PlaceRating[];
  onPlaceDetails: (placeId: string) => void;
  onPlaceClick: (placeId: string) => void;
  onEditPlace: (placeId: string) => void;
  onAddRestaurant: () => void;
  onRatePlace: () => void;
  tripTitle: string;
}

export function MobileTripSwipePanel({ 
  places, 
  onPlaceDetails, 
  onPlaceClick,
  onEditPlace,
  onAddRestaurant,
  onRatePlace,
  tripTitle 
}: MobileTripSwipePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = startY - currentY;
    const threshold = 50;

    if (deltaY > threshold && !isExpanded) {
      setIsExpanded(true);
    } else if (deltaY < -threshold && isExpanded) {
      setIsExpanded(false);
    }

    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  const handleIndicatorClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-[9998] md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Swipe Panel */}
      <div 
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl border-t border-border/50 transition-transform duration-300 ease-out z-[9999] md:hidden ${
          isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'
        }`}
        style={{ 
          height: '85vh',
          maxHeight: '85vh'
        }}
      >
        {/* Swipe Indicator - Only handle touch events here */}
        <div 
          className="flex flex-col items-center pt-3 pb-2 cursor-pointer"
          onClick={handleIndicatorClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mb-3" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            <span className="text-sm font-medium">
              {isExpanded ? 'Swipe down to minimize' : `${places.length} places`}
            </span>
            <ChevronUp className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header when expanded */}
          {isExpanded && (
            <div className="px-4 pb-4 border-b border-border/30">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {tripTitle} Places
              </h2>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={onRatePlace}
                  size="sm"
                  className="flex-1 h-9"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Rate Place
                </Button>
                <Button
                  variant="outline"
                  onClick={onAddRestaurant}
                  size="sm"
                  className="flex-1 h-9"
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  Add Restaurant
                </Button>
              </div>
            </div>
          )}

          {/* Places List */}
          <div className="flex-1 overflow-y-auto">
            {places.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">No places yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start rating places you've visited on this trip
                </p>
                <Button onClick={() => onEditPlace("")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Place
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {places.map((place) => (
                  <MobileTripPlaceCard
                    key={place.id}
                    place={place}
                    onDetailsClick={() => onPlaceDetails(place.id)}
                    onPlaceClick={() => onPlaceClick(place.id)}
                  />
                ))}
                
                {/* Add more places button at bottom */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => onEditPlace("")}
                    className="w-full h-12 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Place
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
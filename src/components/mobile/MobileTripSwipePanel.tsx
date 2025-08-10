import React, { useState } from 'react';
import { ChevronUp, MapPin, Plus, Star, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
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
  tripTitle,
}: MobileTripSwipePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Collapsed trigger bar (mobile only) */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-background/95 backdrop-blur border-t border-border flex items-center justify-center gap-2 py-3"
          aria-label="Open places panel"
       >
          <span className="text-sm font-medium">Places ({places.length})</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      )}

      {/* Drawer sheet */}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="md:hidden h-[85vh] max-h-[85vh] pt-2 pb-safe-area-bottom border-t-0">
          <DrawerHeader className="px-4 pb-4 border-b">
            <DrawerTitle className="text-lg font-semibold">
              {tripTitle} Places
            </DrawerTitle>
            <div className="flex gap-2 mt-3">
              <Button onClick={onRatePlace} size="sm" className="flex-1 h-9">
                <Star className="w-4 h-4 mr-2" />
                Rate Place
              </Button>
              <Button variant="outline" onClick={onAddRestaurant} size="sm" className="flex-1 h-9">
                <Utensils className="w-4 h-4 mr-2" />
                Add Restaurant
              </Button>
            </div>
          </DrawerHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {places.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">No places yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start rating places you've visited on this trip
                </p>
                <Button onClick={() => onEditPlace('')} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Place
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-3 pb-safe-area-bottom">
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
                    onClick={() => onEditPlace('')}
                    className="w-full h-12 border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Place
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

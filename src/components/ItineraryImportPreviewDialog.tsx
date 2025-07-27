import { useState, useEffect } from 'react';
import { Star, MapPin, Calendar, Clock, Loader2, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/StarRating';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Itinerary, ItineraryEvent } from '@/components/ItineraryBuilder';
import { cn } from '@/lib/utils';

interface ItineraryImportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  itinerary: Itinerary | null;
}

interface PlaceWithRating extends ItineraryEvent {
  overallRating?: number;
  notes?: string;
  isSelected: boolean;
}

const RATING_CATEGORIES = {
  restaurant: ['Food Quality', 'Service', 'Atmosphere', 'Value for Money'],
  attraction: ['Experience', 'Crowds', 'Value for Money', 'Accessibility'],
  hotel: ['Cleanliness', 'Service', 'Location', 'Value for Money'],
  museum: ['Exhibits', 'Educational Value', 'Facilities', 'Value for Money'],
  park: ['Nature/Beauty', 'Facilities', 'Cleanliness', 'Accessibility'],
  shopping: ['Selection', 'Prices', 'Service', 'Atmosphere'],
  entertainment: ['Quality', 'Atmosphere', 'Value for Money', 'Experience'],
  transport: ['Cleanliness', 'Punctuality', 'Comfort', 'Value for Money'],
  spa: ['Service', 'Facilities', 'Ambiance', 'Value for Money'],
  bar: ['Drinks Quality', 'Service', 'Atmosphere', 'Value for Money'],
  cafe: ['Coffee Quality', 'Service', 'Atmosphere', 'Value for Money'],
  beach: ['Water Quality', 'Cleanliness', 'Facilities', 'Beauty'],
  landmark: ['Historical Value', 'Accessibility', 'Views', 'Experience'],
  activity: ['Fun Factor', 'Safety', 'Organization', 'Value for Money'],
  other: ['Quality', 'Service', 'Experience', 'Value for Money'],
};

export function ItineraryImportPreviewDialog({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  itinerary
}: ItineraryImportPreviewDialogProps) {
  const { user } = useAuth();
  const [places, setPlaces] = useState<PlaceWithRating[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && itinerary) {
      // Filter out 'other' type events and convert to places with rating capability
      const placeEvents = itinerary.events.filter(event => 
        event.type !== 'other' && event.type !== undefined
      );

      const placesWithRating = placeEvents.map(event => ({
        ...event,
        isSelected: true, // All places selected by default
        overallRating: 0,
        notes: event.description || ''
      }));

      setPlaces(placesWithRating);
    }
  }, [isOpen, itinerary]);

  const togglePlaceSelection = (placeId: string) => {
    setPlaces(prev => prev.map(place => 
      place.id === placeId 
        ? { ...place, isSelected: !place.isSelected }
        : place
    ));
  };

  const updatePlaceRating = (placeId: string, rating: number) => {
    setPlaces(prev => prev.map(place => 
      place.id === placeId 
        ? { ...place, overallRating: rating }
        : place
    ));
  };

  const updatePlaceNotes = (placeId: string, notes: string) => {
    setPlaces(prev => prev.map(place => 
      place.id === placeId 
        ? { ...place, notes }
        : place
    ));
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
      case 'cafe':
      case 'bar':
        return '🍽️';
      case 'hotel':
        return '🏨';
      case 'museum':
        return '🏛️';
      case 'park':
      case 'beach':
        return '🌳';
      case 'shopping':
        return '🛍️';
      case 'entertainment':
        return '🎭';
      case 'attraction':
      case 'landmark':
        return '🗿';
      default:
        return '📍';
    }
  };

  const handleImportSelected = async () => {
    if (!user) return;

    const selectedPlaces = places.filter(place => place.isSelected);
    
    if (selectedPlaces.length === 0) {
      toast.error('Please select at least one place to import');
      return;
    }

    setIsImporting(true);
    
    try {
      // Process each selected place to enrich it with comprehensive data
      const enrichedPlaceRatings = await Promise.all(
        selectedPlaces.map(async (place) => {
          let enrichedData = place;
          
          // For non-restaurant events (attractions, museums, hotels, etc.)
          if (place.type !== 'restaurant' && place.attractionData) {
            try {
              // Enrich place data using Google Places API
              const { data: enrichedPlace } = await supabase.functions.invoke('enrich-place-data', {
                body: {
                  name: place.attractionData.name,
                  address: place.attractionData.address,
                  phone: place.attractionData.phone,
                  website: place.attractionData.website,
                  placeId: place.attractionData.id,
                  latitude: place.attractionData.latitude,
                  longitude: place.attractionData.longitude,
                }
              });

              if (enrichedPlace) {
                enrichedData = {
                  ...place,
                  attractionData: {
                    ...place.attractionData,
                    name: enrichedPlace.name,
                    address: enrichedPlace.address,
                    phone: enrichedPlace.phone,
                    website: enrichedPlace.website,
                    latitude: enrichedPlace.latitude,
                    longitude: enrichedPlace.longitude,
                    rating: enrichedPlace.rating,
                    category: place.attractionData.category,
                  }
                };
              }
            } catch (error) {
              console.error('Failed to enrich place data:', error);
            }
          }

          // Convert to place rating format
          const baseData = {
            user_id: user.id,
            trip_id: tripId,
            place_name: enrichedData.title,
            place_type: enrichedData.type,
            notes: place.notes || null,
            overall_rating: place.overallRating || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (enrichedData.type === 'restaurant' && enrichedData.restaurantData) {
            return {
              ...baseData,
              address: enrichedData.restaurantData.address,
              phone_number: enrichedData.restaurantData.phone || null,
              website: enrichedData.restaurantData.website || null,
              place_id: enrichedData.restaurantData.placeId || null,
            };
          }

          if (enrichedData.type !== 'restaurant' && enrichedData.attractionData) {
            return {
              ...baseData,
              address: enrichedData.attractionData.address,
              phone_number: enrichedData.attractionData.phone || null,
              website: enrichedData.attractionData.website || null,
              latitude: enrichedData.attractionData.latitude || null,
              longitude: enrichedData.attractionData.longitude || null,
              place_id: enrichedData.attractionData.id || null,
              cuisine: enrichedData.attractionData.category || null,
            };
          }

          return baseData;
        })
      );

      // Insert all place ratings
      const { error } = await supabase
        .from('place_ratings')
        .insert(enrichedPlaceRatings.filter(Boolean));

      if (error) {
        console.error('Error importing places:', error);
        toast.error('Failed to import places');
        return;
      }

      toast.success(`Successfully imported ${selectedPlaces.length} places from "${itinerary?.title}" to ${tripTitle}`);
      onClose();
    } catch (error) {
      console.error('Error importing places:', error);
      toast.error('Failed to import places');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = places.filter(p => p.isSelected).length;

  if (!itinerary) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Places from "{itinerary.title}"</DialogTitle>
          <DialogDescription>
            Review and rate the places before adding them to "{tripTitle}". 
            You can select which places to import and add ratings/notes for each one.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {places.map((place) => (
              <Card 
                key={place.id} 
                className={cn(
                  "transition-all cursor-pointer",
                  place.isSelected ? "ring-2 ring-primary" : "opacity-70"
                )}
                onClick={() => togglePlaceSelection(place.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-lg">
                        {getPlaceIcon(place.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{place.title}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {place.type}
                          </Badge>
                          {place.isSelected ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        {(place.restaurantData?.address || place.attractionData?.address) && (
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4" />
                            {place.restaurantData?.address || place.attractionData?.address}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPlace(expandedPlace === place.id ? null : place.id);
                      }}
                      disabled={!place.isSelected}
                    >
                      {expandedPlace === place.id ? 'Hide' : 'Rate'}
                    </Button>
                  </div>
                </CardHeader>
                
                {expandedPlace === place.id && place.isSelected && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Overall Rating</label>
                        <StarRating
                          rating={place.overallRating || 0}
                          onRatingChange={(rating) => updatePlaceRating(place.id, rating)}
                          size="lg"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Notes</label>
                        <Textarea
                          value={place.notes || ''}
                          onChange={(e) => updatePlaceNotes(place.id, e.target.value)}
                          placeholder="Add your thoughts, recommendations, or memories about this place..."
                          className="min-h-[80px]"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount} of {places.length} places selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button 
              onClick={handleImportSelected} 
              disabled={selectedCount === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedCount} Place${selectedCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, MapPin, Clock, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Itinerary, ItineraryEvent } from '@/components/ItineraryBuilder';
import { ItineraryImportPreviewDialog } from '@/components/ItineraryImportPreviewDialog';

interface AddItineraryToTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

export function AddItineraryToTripDialog({
  isOpen,
  onClose,
  tripId,
  tripTitle
}: AddItineraryToTripDialogProps) {
  const { user } = useAuth();
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [previewItinerary, setPreviewItinerary] = useState<Itinerary | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedItineraries();
    }
  }, [isOpen]);

  const loadSavedItineraries = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First try to load from Supabase
      const { data: supabaseItineraries, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading itineraries from Supabase:', error);
      }

      // Also load from localStorage as fallback
      const localItineraries = JSON.parse(localStorage.getItem('savedItineraries') || '[]')
        .filter((it: any) => it.userId === user.id)
        .map((it: any) => ({
          ...it,
          startDate: new Date(it.startDate),
          endDate: new Date(it.endDate),
          locations: it.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : undefined,
            endDate: loc.endDate ? new Date(loc.endDate) : undefined,
          })),
        }));

      // Combine and deduplicate
      const allItineraries = [...(supabaseItineraries || []), ...localItineraries];
      const uniqueItineraries = allItineraries.filter((it, index, self) => 
        index === self.findIndex(other => other.id === it.id)
      );

      setSavedItineraries(uniqueItineraries);
    } catch (error) {
      console.error('Error loading saved itineraries:', error);
      toast.error('Failed to load saved itineraries');
    } finally {
      setLoading(false);
    }
  };


  const handleImportItinerary = (itinerary: Itinerary) => {
    setPreviewItinerary(itinerary);
  };
  const handleConfirmImport = async (eventsWithRatings: (ItineraryEvent & { placeRating?: any })[]) => {
    if (!user || !previewItinerary) return;

    setImporting(previewItinerary.id || previewItinerary.title);
    
    try {
      // Process each event to enrich it with comprehensive data
      const enrichedPlaceRatings = await Promise.all(
        eventsWithRatings.map(async (event) => {
          let enrichedData = event;
          
          // For non-restaurant events (attractions, museums, hotels, etc.)
          if (event.type !== 'restaurant' && event.attractionData) {
            try {
              // Enrich place data using Google Places API
              const { data: enrichedPlace } = await supabase.functions.invoke('enrich-place-data', {
                body: {
                  name: event.attractionData.name,
                  address: event.attractionData.address,
                  phone: event.attractionData.phone,
                  website: event.attractionData.website,
                  placeId: event.attractionData.id,
                  latitude: event.attractionData.latitude,
                  longitude: event.attractionData.longitude,
                }
              });

              if (enrichedPlace) {
                // Update the event with enriched data
                enrichedData = {
                  ...event,
                  attractionData: {
                    ...event.attractionData,
                    name: enrichedPlace.name,
                    address: enrichedPlace.address,
                    phone: enrichedPlace.phone,
                    website: enrichedPlace.website,
                    latitude: enrichedPlace.latitude,
                    longitude: enrichedPlace.longitude,
                    rating: enrichedPlace.rating,
                    category: event.attractionData.category,
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
            notes: event.placeRating?.notes || enrichedData.description || null,
            overall_rating: event.placeRating?.overall_rating || null,
            category_ratings: event.placeRating?.category_ratings || null,
            date_visited: event.placeRating?.date_visited || null,
            photos: event.placeRating?.photos || null,
            price_range: event.placeRating?.price_range || null,
            michelin_stars: event.placeRating?.michelin_stars || null,
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
              overall_rating: event.placeRating?.overall_rating || enrichedData.attractionData.rating || null,
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
        console.error('Error importing itinerary:', error);
        toast.error('Failed to import itinerary');
        return;
      }

      toast.success(`Successfully imported ${enrichedPlaceRatings.length} places from "${previewItinerary.title}" to ${tripTitle}`);
      setPreviewItinerary(null);
      onClose();
    } catch (error) {
      console.error('Error importing itinerary:', error);
      toast.error('Failed to import itinerary');
    } finally {
      setImporting(null);
    }
  };

  const getEventCounts = (events: ItineraryEvent[]) => {
    const restaurants = events.filter(e => e.type === 'restaurant').length;
    const hotels = events.filter(e => e.type === 'hotel').length;
    const museums = events.filter(e => e.type === 'museum').length;
    const parks = events.filter(e => e.type === 'park').length;
    const monuments = events.filter(e => e.type === 'monument').length;
    const shopping = events.filter(e => e.type === 'shopping').length;
    const entertainment = events.filter(e => e.type === 'entertainment').length;
    const attractions = events.filter(e => e.type === 'attraction').length;
    const other = events.filter(e => e.type === 'other').length;
    
    return { 
      restaurants, 
      hotels,
      museums,
      parks,
      monuments,
      shopping,
      entertainment,
      attractions,
      other,
      totalPlaces: restaurants + hotels + museums + parks + monuments + shopping + entertainment + attractions
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Itinerary to Trip</DialogTitle>
          <DialogDescription>
            Select a saved itinerary to import its restaurants and attractions into "{tripTitle}".
            Events and flights will not be imported.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading itineraries...
            </div>
          ) : savedItineraries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No saved itineraries found</p>
              <p className="text-sm">Create and save an itinerary first to import it into trips</p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedItineraries.map((itinerary) => {
                const eventCounts = getEventCounts(itinerary.events);
                const importableCount = eventCounts.totalPlaces;
                const isImporting = importing === (itinerary.id || itinerary.title);

                return (
                  <Card key={itinerary.id || itinerary.title} className="transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{itinerary.title}</CardTitle>
                          <CardDescription className="space-y-1 mt-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="w-4 h-4" />
                              {format(itinerary.startDate, 'MMM d')} - {format(itinerary.endDate, 'MMM d, yyyy')}
                            </div>
                            {itinerary.locations.length > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4" />
                                {itinerary.locations.map(loc => loc.name).join(' → ')}
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleImportItinerary(itinerary)}
                          disabled={importableCount === 0 || isImporting}
                          size="sm"
                          className="shrink-0 ml-4"
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {eventCounts.restaurants > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {eventCounts.restaurants} Restaurant{eventCounts.restaurants !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {eventCounts.hotels > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {eventCounts.hotels} Hotel{eventCounts.hotels !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {eventCounts.museums > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {eventCounts.museums} Museum{eventCounts.museums !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {eventCounts.attractions > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {eventCounts.attractions} Attraction{eventCounts.attractions !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {(eventCounts.parks + eventCounts.monuments + eventCounts.shopping + eventCounts.entertainment) > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {eventCounts.parks + eventCounts.monuments + eventCounts.shopping + eventCounts.entertainment} Other Place{(eventCounts.parks + eventCounts.monuments + eventCounts.shopping + eventCounts.entertainment) !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {eventCounts.other > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {eventCounts.other} Other Event{eventCounts.other !== 1 ? 's' : ''} (not imported)
                          </Badge>
                        )}
                      </div>
                      
                      {importableCount === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          No places to import
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      {/* Import Preview Dialog */}
      <ItineraryImportPreviewDialog
        isOpen={!!previewItinerary}
        onClose={() => setPreviewItinerary(null)}
        itineraryTitle={previewItinerary?.title || ''}
        events={previewItinerary?.events || []}
        tripId={tripId}
        tripTitle={tripTitle}
        onConfirmImport={handleConfirmImport}
      />
    </Dialog>
  );
}
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

  const convertEventToPlaceRating = async (event: ItineraryEvent) => {
    if (event.type === 'other') return null;

    // Try to get comprehensive place data from Google Places API
    let enrichedPlaceData = null;
    
    try {
      let searchQuery = event.title;
      let placeId = null;

      // Get place ID from event data if available
      if (event.type === 'restaurant' && event.restaurantData?.placeId) {
        placeId = event.restaurantData.placeId;
      } else if (event.type === 'attraction' && event.attractionData?.id) {
        placeId = event.attractionData.id;
      }

      // If we have address info, include it in search for better results
      if (event.type === 'restaurant' && event.restaurantData?.address) {
        searchQuery = `${event.title} ${event.restaurantData.address}`;
      } else if (event.type === 'attraction' && event.attractionData?.address) {
        searchQuery = `${event.title} ${event.attractionData.address}`;
      }

      // Fetch detailed place information
      if (placeId) {
        const { data: detailsData } = await supabase.functions.invoke('google-places-search', {
          body: {
            placeId: placeId,
            type: 'details'
          }
        });
        enrichedPlaceData = detailsData?.result;
      } else {
        const { data: searchData } = await supabase.functions.invoke('google-places-search', {
          body: {
            query: searchQuery,
            type: 'search'
          }
        });
        if (searchData?.results?.length > 0) {
          const topResult = searchData.results[0];
          const { data: detailsData } = await supabase.functions.invoke('google-places-search', {
            body: {
              placeId: topResult.place_id,
              type: 'details'
            }
          });
          enrichedPlaceData = detailsData?.result;
        }
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }

    // Determine proper place type based on Google Places data
    let placeType: 'restaurant' | 'attraction' = event.type as 'restaurant' | 'attraction';
    if (enrichedPlaceData?.types) {
      const types = enrichedPlaceData.types;
      if (types.includes('lodging') || types.includes('hotel')) {
        // Hotels will be categorized as attractions for now, but we'll note it in the place name
        placeType = 'attraction';
      } else if (types.includes('restaurant') || types.includes('food') || types.includes('meal_takeaway')) {
        placeType = 'restaurant';
      } else {
        placeType = 'attraction';
      }
    }

    const baseData = {
      user_id: user!.id,
      trip_id: tripId,
      place_name: enrichedPlaceData?.name || event.title,
      place_type: placeType,
      notes: event.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Enhanced data from Google Places
      address: enrichedPlaceData?.formatted_address || 
               (event.type === 'restaurant' ? event.restaurantData?.address : 
                event.type === 'attraction' ? event.attractionData?.address : null),
      phone_number: enrichedPlaceData?.formatted_phone_number || 
                   (event.type === 'restaurant' ? event.restaurantData?.phone : 
                    event.type === 'attraction' ? event.attractionData?.phone : null),
      website: enrichedPlaceData?.website || 
               (event.type === 'restaurant' ? event.restaurantData?.website : 
                event.type === 'attraction' ? event.attractionData?.website : null),
      place_id: enrichedPlaceData?.place_id || 
                (event.type === 'restaurant' ? event.restaurantData?.placeId : 
                 event.type === 'attraction' ? event.attractionData?.id : null),
      overall_rating: enrichedPlaceData?.rating || 
                     (event.type === 'attraction' ? event.attractionData?.rating : null),
      latitude: enrichedPlaceData?.geometry?.location?.lat || 
                (event.type === 'attraction' ? event.attractionData?.latitude : null),
      longitude: enrichedPlaceData?.geometry?.location?.lng || 
                 (event.type === 'attraction' ? event.attractionData?.longitude : null),
      price_range: enrichedPlaceData?.price_level || null,
    };

    return baseData;
  };

  const handleImportItinerary = async (itinerary: Itinerary) => {
    if (!user) return;

    setImporting(itinerary.id || itinerary.title);
    
    try {
      // Filter out 'other' type events and convert to place ratings
      const placeEvents = itinerary.events.filter(event => 
        event.type === 'restaurant' || event.type === 'attraction'
      );

      if (placeEvents.length === 0) {
        toast.error('No restaurants or attractions found in this itinerary');
        return;
      }

      // Show progress toast
      toast.loading(`Importing ${placeEvents.length} places...`, {
        id: `import-${itinerary.id}`,
      });

      // Convert events to place ratings with enriched data (sequential to avoid rate limits)
      const placeRatings = [];
      for (let i = 0; i < placeEvents.length; i++) {
        const event = placeEvents[i];
        try {
          const placeRating = await convertEventToPlaceRating(event);
          if (placeRating) {
            placeRatings.push(placeRating);
          }
          
          // Update progress
          toast.loading(`Importing ${i + 1}/${placeEvents.length} places...`, {
            id: `import-${itinerary.id}`,
          });
        } catch (error) {
          console.error(`Error converting event ${event.title}:`, error);
          // Continue with basic data if API fails
          const basicRating = {
            user_id: user.id,
            trip_id: tripId,
            place_name: event.title,
            place_type: event.type,
            notes: event.description || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            address: event.type === 'restaurant' ? event.restaurantData?.address : 
                    event.type === 'attraction' ? event.attractionData?.address : null,
          };
          placeRatings.push(basicRating);
        }
      }

      // Insert all place ratings
      const { error } = await supabase
        .from('place_ratings')
        .insert(placeRatings);

      if (error) {
        console.error('Error importing itinerary:', error);
        toast.error('Failed to import itinerary', { id: `import-${itinerary.id}` });
        return;
      }

      toast.success(`Successfully imported ${placeRatings.length} places from "${itinerary.title}" to ${tripTitle}`, {
        id: `import-${itinerary.id}`,
      });
      onClose();
    } catch (error) {
      console.error('Error importing itinerary:', error);
      toast.error('Failed to import itinerary', { id: `import-${itinerary.id}` });
    } finally {
      setImporting(null);
    }
  };

  const getEventCounts = (events: ItineraryEvent[]) => {
    const restaurants = events.filter(e => e.type === 'restaurant').length;
    const attractions = events.filter(e => e.type === 'attraction').length;
    const other = events.filter(e => e.type === 'other').length;
    return { restaurants, attractions, other };
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
                const importableCount = eventCounts.restaurants + eventCounts.attractions;
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
                        {eventCounts.attractions > 0 && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {eventCounts.attractions} Attraction{eventCounts.attractions !== 1 ? 's' : ''}
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
                          No restaurants or attractions to import
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
    </Dialog>
  );
}
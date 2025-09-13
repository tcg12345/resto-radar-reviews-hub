import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, MapPinIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Itinerary {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  events: any;
  locations: any;
}

interface RestaurantEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  restaurantData: any;
}

interface ImportFromItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (restaurants: any[]) => Promise<void>;
  listName: string;
}

export function ImportFromItineraryDialog({ 
  isOpen, 
  onClose, 
  onImport,
  listName 
}: ImportFromItineraryDialogProps) {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [restaurantEvents, setRestaurantEvents] = useState<RestaurantEvent[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchItineraries();
    }
  }, [isOpen]);

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const typedItineraries = (data || []).map(item => ({
        ...item,
        events: Array.isArray(item.events) ? item.events : [],
        locations: Array.isArray(item.locations) ? item.locations : []
      }));
      
      setItineraries(typedItineraries);
    } catch (error: any) {
      console.error('Error fetching itineraries:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load itineraries',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItinerarySelect = (itinerary: Itinerary) => {
    setSelectedItinerary(itinerary);
    
    // Extract restaurant events from the itinerary
    const events = Array.isArray(itinerary.events) ? itinerary.events : [];
    const restaurants = events
      .filter(event => event.type === 'restaurant' && event.restaurantData)
      .map(event => ({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        restaurantData: event.restaurantData
      }));

    setRestaurantEvents(restaurants);
    setSelectedRestaurants(new Set());
  };

  const handleRestaurantToggle = (restaurantId: string) => {
    const newSelected = new Set(selectedRestaurants);
    if (newSelected.has(restaurantId)) {
      newSelected.delete(restaurantId);
    } else {
      newSelected.add(restaurantId);
    }
    setSelectedRestaurants(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRestaurants.size === restaurantEvents.length) {
      setSelectedRestaurants(new Set());
    } else {
      setSelectedRestaurants(new Set(restaurantEvents.map(r => r.id)));
    }
  };

  const handleImport = async () => {
    if (selectedRestaurants.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No Selection',
        description: 'Please select at least one restaurant to import',
      });
      return;
    }

    try {
      setImporting(true);
      
      // Convert selected restaurant events to restaurant data
      const restaurantsToImport = restaurantEvents
        .filter(event => selectedRestaurants.has(event.id))
        .map(event => ({
          name: event.restaurantData.name || event.title,
          address: event.restaurantData.address || '',
          city: event.restaurantData.city || '',
          cuisine: event.restaurantData.cuisine || '',
          country: event.restaurantData.country || '',
          latitude: event.restaurantData.latitude || null,
          longitude: event.restaurantData.longitude || null,
          website: event.restaurantData.website || '',
          phone_number: event.restaurantData.phone || '',
          google_place_id: event.restaurantData.placeId || null,
          is_wishlist: true, // Import as wishlist items initially
          notes: `Imported from itinerary: ${selectedItinerary?.title}`
        }));

      await onImport(restaurantsToImport);
      onClose();
      
      toast({
        title: 'Import Successful',
        description: `Imported ${restaurantsToImport.length} restaurant${restaurantsToImport.length !== 1 ? 's' : ''} to ${listName}`,
      });
      
    } catch (error: any) {
      console.error('Error importing restaurants:', error);
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: 'Failed to import restaurants from itinerary',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedItinerary(null);
    setRestaurantEvents([]);
    setSelectedRestaurants(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import from Itinerary</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {!selectedItinerary ? (
            // Step 1: Select Itinerary
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select an itinerary to import restaurants from:
              </p>
              
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : itineraries.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No itineraries found. Create an itinerary on the Travel page first.
                </p>
              ) : (
                <div className="space-y-2">
                  {itineraries.map(itinerary => {
                    const events = Array.isArray(itinerary.events) ? itinerary.events : [];
                    const restaurantCount = events.filter(
                      event => event.type === 'restaurant'
                    ).length;

                    return (
                      <Card 
                        key={itinerary.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleItinerarySelect(itinerary)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{itinerary.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4" />
                              {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
                            </div>
                            <Badge variant="secondary">
                              {restaurantCount} restaurant{restaurantCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Step 2: Select Restaurants
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedItinerary.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Select restaurants to import to "{listName}":
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItinerary(null)}
                >
                  Back
                </Button>
              </div>

              {restaurantEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No restaurants found in this itinerary.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedRestaurants.size === restaurantEvents.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium">
                        Select All ({restaurantEvents.length})
                      </label>
                    </div>
                    <Badge variant="secondary">
                      {selectedRestaurants.size} selected
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {restaurantEvents.map(restaurant => (
                      <Card key={restaurant.id} className="p-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={selectedRestaurants.has(restaurant.id)}
                            onCheckedChange={() => handleRestaurantToggle(restaurant.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{restaurant.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{restaurant.date}</span>
                              <span>•</span>
                              <span>{restaurant.time}</span>
                              {restaurant.restaurantData?.address && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="h-3 w-3" />
                                    <span className="truncate">
                                      {restaurant.restaurantData.address}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {selectedItinerary && restaurantEvents.length > 0 && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={selectedRestaurants.size === 0 || importing}
            >
              {importing ? 'Importing...' : `Import ${selectedRestaurants.size} Restaurant${selectedRestaurants.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Edit, Star, Utensils, Building, TreePine, ShoppingCart, Camera } from 'lucide-react';
import { ItineraryEvent } from '@/components/ItineraryBuilder';
import { PlaceRatingDialog } from '@/components/PlaceRatingDialog';
import { toast } from 'sonner';

interface ItineraryImportPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryTitle: string;
  events: ItineraryEvent[];
  tripId: string;
  tripTitle: string;
  onConfirmImport: (eventsWithRatings: (ItineraryEvent & { placeRating?: any })[]) => void;
}

export function ItineraryImportPreviewDialog({
  isOpen,
  onClose,
  itineraryTitle,
  events,
  tripId,
  tripTitle,
  onConfirmImport
}: ItineraryImportPreviewDialogProps) {
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [eventsWithRatings, setEventsWithRatings] = useState<(ItineraryEvent & { placeRating?: any })[]>(
    events.filter(event => event.type !== 'other')
  );

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Utensils className="w-5 h-5 text-orange-600" />;
      case 'hotel':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'museum':
        return <Camera className="w-5 h-5 text-purple-600" />;
      case 'park':
        return <TreePine className="w-5 h-5 text-green-600" />;
      case 'shopping':
        return <ShoppingCart className="w-5 h-5 text-pink-600" />;
      default:
        return <MapPin className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'hotel':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'museum':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'park':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shopping':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleEditPlace = (index: number) => {
    setEditingEventIndex(index);
  };

  const handleSaveRating = () => {
    // This will be triggered when PlaceRatingDialog closes after saving
    // We'll need to refresh the data or handle it differently
    setEditingEventIndex(null);
    toast.success('Place rating saved');
  };

  const handleConfirmImport = () => {
    // For now, we'll import all events - ratings will be handled by PlaceRatingDialog
    onConfirmImport(eventsWithRatings);
  };

  const editingEvent = editingEventIndex !== null ? eventsWithRatings[editingEventIndex] : null;
  const editingPlaceData = editingEvent ? {
    place_name: editingEvent.title,
    place_type: editingEvent.type,
    address: editingEvent.attractionData?.address || editingEvent.restaurantData?.address,
    latitude: editingEvent.attractionData?.latitude,
    longitude: editingEvent.attractionData?.longitude,
    website: editingEvent.attractionData?.website || editingEvent.restaurantData?.website,
    phone_number: editingEvent.attractionData?.phone || editingEvent.restaurantData?.phone,
    place_id: editingEvent.attractionData?.id || editingEvent.restaurantData?.placeId,
    overall_rating: editingEvent.placeRating?.overall_rating || 0,
    category_ratings: editingEvent.placeRating?.category_ratings || {},
    notes: editingEvent.placeRating?.notes || '',
    date_visited: editingEvent.placeRating?.date_visited,
    photos: editingEvent.placeRating?.photos || [],
    price_range: editingEvent.placeRating?.price_range,
    michelin_stars: editingEvent.placeRating?.michelin_stars,
    cuisine: editingEvent.attractionData?.category
  } : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Preview: {itineraryTitle}</DialogTitle>
            <DialogDescription>
              Review and rate the {eventsWithRatings.length} places that will be added to {tripTitle}.
              Click "Edit" to add ratings and notes for each place.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {eventsWithRatings.map((event, index) => {
                const hasRating = event.placeRating?.overall_rating > 0;
                const placeData = event.attractionData || event.restaurantData;
                
                return (
                  <Card key={event.id} className={`transition-all duration-200 ${hasRating ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getPlaceIcon(event.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{event.title}</CardTitle>
                              <Badge variant="outline" className={getTypeColor(event.type)}>
                                {event.type}
                              </Badge>
                              {hasRating && (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <Star className="w-3 h-3 mr-1" />
                                  {event.placeRating.overall_rating}/10
                                </Badge>
                              )}
                            </div>
                            {placeData?.address && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                <MapPin className="w-3 h-3" />
                                {placeData.address}
                              </div>
                            )}
                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                            )}
                            {event.date && event.time && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {event.date} at {event.time}
                              </div>
                            )}
                            {hasRating && event.placeRating.notes && (
                              <div className="mt-2 p-2 bg-muted rounded text-sm">
                                <strong>Notes:</strong> {event.placeRating.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlace(index)}
                          className="shrink-0"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          {hasRating ? 'Edit' : 'Rate'}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              Import {eventsWithRatings.length} Places to Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place Rating Dialog */}
      <PlaceRatingDialog
        isOpen={editingEventIndex !== null}
        onClose={handleSaveRating}
        tripId={tripId}
        tripTitle={tripTitle}
        editPlaceId={editingEvent?.id}
        editPlaceData={editingPlaceData}
      />
    </>
  );
}
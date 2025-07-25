import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, Search, Utensils, MapPinIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RestaurantSearchDialog } from '@/components/RestaurantSearchDialog';
import { AttractionsSearch } from '@/components/AttractionsSearch';
import { ItineraryEvent } from '@/components/ItineraryBuilder';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<ItineraryEvent, 'id'>) => void;
  selectedDate: string | null;
  editingEvent: ItineraryEvent | null;
  itineraryLocation?: string;
}

interface RestaurantData {
  name: string;
  address: string;
  placeId?: string;
  phone?: string;
  website?: string;
}

interface AttractionData {
  id: string;
  name: string;
  address: string;
  category?: string;
  rating?: number;
  website?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

export function EventDialog({ isOpen, onClose, onSave, selectedDate, editingEvent, itineraryLocation }: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'restaurant' | 'attraction' | 'other'>('other');
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [attractionData, setAttractionData] = useState<AttractionData | null>(null);
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);

  // Reset form when dialog opens/closes or editing event changes
  useEffect(() => {
    if (isOpen && editingEvent) {
      // Handle restaurant, attraction, and other event types
      if (editingEvent.type === 'restaurant' || editingEvent.type === 'attraction' || editingEvent.type === 'other') {
        setTitle(editingEvent.title);
        setDescription(editingEvent.description || '');
        setTime(editingEvent.time);
        setType(editingEvent.type);
        setRestaurantData(editingEvent.restaurantData || null);
        setAttractionData(editingEvent.attractionData || null);
      }
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setTime('');
      setType('other');
      setRestaurantData(null);
      setAttractionData(null);
    }
  }, [isOpen, editingEvent]);

  const handleSave = () => {
    if (!title.trim() || !time || !selectedDate) return;

    const eventData: Omit<ItineraryEvent, 'id'> = {
      title: title.trim(),
      description: description.trim() || undefined,
      time,
      date: selectedDate,
      type,
      restaurantData: type === 'restaurant' ? restaurantData : undefined,
      attractionData: type === 'attraction' ? attractionData : undefined,
    };

    onSave(eventData);
    handleClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setTime('');
    setType('other');
    setRestaurantData(null);
    setAttractionData(null);
    onClose();
  };

  const handleRestaurantSelect = (restaurant: any) => {
    setRestaurantData({
      name: restaurant.name,
      address: restaurant.formatted_address || restaurant.vicinity,
      placeId: restaurant.place_id,
      phone: restaurant.formatted_phone_number,
      website: restaurant.website,
    });
    setTitle(restaurant.name);
    setType('restaurant');
    setIsRestaurantSearchOpen(false);
  };

  const handleAttractionSelect = (attraction: AttractionData | null) => {
    setAttractionData(attraction);
    if (attraction) {
      setTitle(attraction.name);
      setType('attraction');
    }
  };

  const formattedDate = selectedDate ? format(new Date(selectedDate), 'EEEE, MMMM do') : '';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
            <DialogDescription>
              {formattedDate && `Adding event for ${formattedDate}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Event Type Selection */}
            <div className="space-y-3">
              <Label>Event Type</Label>
              <Tabs value={type} onValueChange={(value) => setType(value as typeof type)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="restaurant" className="flex items-center gap-1 text-xs">
                    <Utensils className="w-3 h-3" />
                    Restaurant
                  </TabsTrigger>
                  <TabsTrigger value="attraction" className="flex items-center gap-1 text-xs">
                    <MapPinIcon className="w-3 h-3" />
                    Places
                  </TabsTrigger>
                  <TabsTrigger value="other" className="flex items-center gap-1 text-xs">
                    <Clock className="w-3 h-3" />
                    Other
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="restaurant" className="space-y-4">
                  {restaurantData ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{restaurantData.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {restaurantData.address}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">Restaurant</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRestaurantSearchOpen(true)}
                        >
                          Change Restaurant
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => setIsRestaurantSearchOpen(true)}
                    >
                      <Search className="w-4 h-4" />
                      Search for Restaurant
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="attraction" className="space-y-4">
                  {attractionData ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{attractionData.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {attractionData.address}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">{attractionData.category || 'Attraction'}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAttractionData(null)}
                        >
                          Change Place
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Search for attractions, museums, landmarks, and places to visit.
                      </p>
                      <AttractionsSearch
                        value={attractionData}
                        onChange={handleAttractionSelect}
                        location={itineraryLocation}
                        placeholder="Search Louvre, Eiffel Tower, Central Park..."
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="other">
                  <p className="text-sm text-muted-foreground">
                    Add any other type of event or reminder.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter event title..."
                className="w-full"
              />
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or additional details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!title.trim() || !time}
            >
              {editingEvent ? 'Update Event' : 'Add Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RestaurantSearchDialog
        isOpen={isRestaurantSearchOpen}
        onClose={() => setIsRestaurantSearchOpen(false)}
        onSelect={handleRestaurantSelect}
      />
    </>
  );
}
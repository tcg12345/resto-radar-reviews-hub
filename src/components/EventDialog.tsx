import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, MapPin, Search, Utensils, Activity, Plane, Hotel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RestaurantSearchDialog } from '@/components/RestaurantSearchDialog';
import { FlightSearchDialog } from '@/components/FlightSearchDialog';
import { HotelSearchDialog } from '@/components/HotelSearchDialog';
import { ItineraryEvent } from '@/components/ItineraryBuilder';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<ItineraryEvent, 'id'>) => void;
  selectedDate: string | null;
  editingEvent: ItineraryEvent | null;
}

interface RestaurantData {
  name: string;
  address: string;
  placeId?: string;
  phone?: string;
  website?: string;
}

interface FlightData {
  flightNumber: string;
  airline: string;
  departure: {
    airport: string;
    time: string;
    date: string;
  };
  arrival: {
    airport: string;
    time: string;
    date: string;
  };
  duration?: string;
  price?: string;
  bookingUrl?: string;
}

interface HotelData {
  name: string;
  address: string;
  rating?: number;
  priceRange?: string;
  amenities?: string[];
  website?: string;
  bookingUrl?: string;
}

export function EventDialog({ isOpen, onClose, onSave, selectedDate, editingEvent }: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'restaurant' | 'activity' | 'flight' | 'hotel' | 'other'>('other');
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [flightData, setFlightData] = useState<FlightData | null>(null);
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const [isRestaurantSearchOpen, setIsRestaurantSearchOpen] = useState(false);
  const [isFlightSearchOpen, setIsFlightSearchOpen] = useState(false);
  const [isHotelSearchOpen, setIsHotelSearchOpen] = useState(false);

  // Reset form when dialog opens/closes or editing event changes
  useEffect(() => {
    if (isOpen && editingEvent) {
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setTime(editingEvent.time);
      setType(editingEvent.type);
      setRestaurantData(editingEvent.restaurantData || null);
      setFlightData(editingEvent.flightData || null);
      setHotelData(editingEvent.hotelData || null);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setTime('');
      setType('other');
      setRestaurantData(null);
      setFlightData(null);
      setHotelData(null);
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
      flightData: type === 'flight' ? flightData : undefined,
      hotelData: type === 'hotel' ? hotelData : undefined,
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
    setFlightData(null);
    setHotelData(null);
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

  const handleFlightSelect = (flight: any) => {
    setFlightData(flight);
    setTitle(`${flight.airline} ${flight.flightNumber}`);
    setType('flight');
    setTime(flight.departure.time);
    setIsFlightSearchOpen(false);
  };

  const handleHotelSelect = (hotel: any) => {
    setHotelData(hotel);
    setTitle(hotel.name);
    setType('hotel');
    setTime('15:00'); // Standard check-in time
    setIsHotelSearchOpen(false);
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
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="restaurant" className="flex items-center gap-1 text-xs">
                    <Utensils className="w-3 h-3" />
                    Restaurant
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-1 text-xs">
                    <Activity className="w-3 h-3" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="flight" className="flex items-center gap-1 text-xs">
                    <Plane className="w-3 h-3" />
                    Flight
                  </TabsTrigger>
                  <TabsTrigger value="hotel" className="flex items-center gap-1 text-xs">
                    <Hotel className="w-3 h-3" />
                    Hotel
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

                <TabsContent value="flight" className="space-y-4">
                  {flightData ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{flightData.airline} {flightData.flightNumber}</CardTitle>
                            <CardDescription className="mt-1">
                              {flightData.departure.airport} → {flightData.arrival.airport}
                            </CardDescription>
                            <CardDescription className="text-xs mt-1">
                              Departs: {flightData.departure.time} | Arrives: {flightData.arrival.time}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary">Flight</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFlightSearchOpen(true)}
                        >
                          Change Flight
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => setIsFlightSearchOpen(true)}
                    >
                      <Search className="w-4 h-4" />
                      Search for Flight
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="hotel" className="space-y-4">
                  {hotelData ? (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{hotelData.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {hotelData.address}
                            </CardDescription>
                            {hotelData.rating && (
                              <CardDescription className="text-xs mt-1">
                                Rating: {hotelData.rating}/5 {hotelData.priceRange && `| ${hotelData.priceRange}`}
                              </CardDescription>
                            )}
                          </div>
                          <Badge variant="secondary">Hotel</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsHotelSearchOpen(true)}
                        >
                          Change Hotel
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      onClick={() => setIsHotelSearchOpen(true)}
                    >
                      <Search className="w-4 h-4" />
                      Search for Hotel
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="activity">
                  <p className="text-sm text-muted-foreground">
                    Add details about your planned activity below.
                  </p>
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

      <FlightSearchDialog
        isOpen={isFlightSearchOpen}
        onClose={() => setIsFlightSearchOpen(false)}
        onSelect={handleFlightSelect}
        selectedDate={selectedDate}
      />
      <HotelSearchDialog
        isOpen={isHotelSearchOpen}
        onClose={() => setIsHotelSearchOpen(false)}
        onSelect={handleHotelSelect}
      />
    </>
  );
}
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Hotel, Clock, MapPin, Star, Wifi, Car, Coffee, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAmadeusApi, AmadeusCity } from '@/hooks/useAmadeusApi';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';
import { toast } from 'sonner';

interface HotelSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (hotel: any) => void;
  selectedDate: string | null;
}

interface Hotel {
  id: string;
  name: string;
  address: string;
  description?: string;
  rating?: number;
  priceRange?: string;
  amenities?: string[];
  photos?: string[];
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  bookingUrl?: string;
}

export function HotelSearchDialog({ isOpen, onClose, onSelect, selectedDate }: HotelSearchDialogProps) {
  const [location, setLocation] = useState('');
  const [selectedCity, setSelectedCity] = useState<AmadeusCity | null>(null);
  const [checkInDate, setCheckInDate] = useState(selectedDate || '');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guests, setGuests] = useState('2');
  const [priceRange, setPriceRange] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchHotels } = useAmadeusApi();

  const handleSearch = async () => {
    const locationCode = selectedCity?.iataCode || location.match(/\(([A-Z]{3})\)/)?.[1] || location.toUpperCase();
    
    if (!locationCode || !checkInDate || !checkOutDate) {
      toast.error('Please enter location, check-in and check-out dates');
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        location: locationCode,
        checkInDate,
        checkOutDate,
        guests: parseInt(guests),
        priceRange: priceRange || undefined,
      };

      const results = await searchHotels(searchParams);
      setHotels(results);

      if (results.length === 0) {
        toast.info('No hotels found for the specified criteria');
      } else {
        toast.success(`Found ${results.length} hotels`);
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
      toast.error('Failed to search hotels. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelSelect = (hotel: Hotel) => {
    onSelect({
      name: hotel.name,
      address: hotel.address,
      checkInDate,
      checkOutDate,
      guests: parseInt(guests),
      rating: hotel.rating,
      priceRange: hotel.priceRange,
      amenities: hotel.amenities,
      website: hotel.website,
      bookingUrl: hotel.bookingUrl,
    });
    handleClose();
    toast.success('Hotel added to your itinerary!');
  };

  const handleClose = () => {
    setLocation('');
    setSelectedCity(null);
    setCheckInDate(selectedDate || '');
    setCheckOutDate('');
    setGuests('2');
    setPriceRange('');
    setHotels([]);
    onClose();
  };

  const formattedCheckIn = checkInDate ? format(parseISO(checkInDate), 'MMM do') : '';
  const formattedCheckOut = checkOutDate ? format(parseISO(checkOutDate), 'MMM do') : '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[95vh] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-xl bg-primary/10">
              <Hotel className="w-6 h-6 text-primary" />
            </div>
            Hotel Search
          </DialogTitle>
          <DialogDescription className="text-lg">
            {formattedCheckIn && formattedCheckOut && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {formattedCheckIn} - {formattedCheckOut}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="space-y-6 border-b pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <AmadeusCitySearch
                value={location}
                onChange={setLocation}
                onCitySelect={setSelectedCity}
                placeholder="New York, Paris, Tokyo..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Guests
              </Label>
              <Select value={guests} onValueChange={setGuests}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Guest' : 'Guests'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Check-in Date</Label>
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Check-out Date</Label>
              <Input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Price Range (Optional)</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder="Any price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any price</SelectItem>
                  <SelectItem value="budget">Budget ($0-100)</SelectItem>
                  <SelectItem value="mid-range">Mid-range ($100-300)</SelectItem>
                  <SelectItem value="luxury">Luxury ($300+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !location || !checkInDate || !checkOutDate}
            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Search className="w-5 h-5 mr-2" />
            {isSearching ? 'Searching Hotels...' : 'Search Hotels'}
          </Button>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {hotels.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-primary" />
                  {hotels.length} Available Hotels
                </h3>
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedCity?.name || location}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{hotel.name}</h3>
                            {hotel.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{hotel.rating}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                            <MapPin className="w-4 h-4" />
                            <span>{hotel.address}</span>
                          </div>

                          {hotel.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {hotel.description}
                            </p>
                          )}

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                              {hotel.amenities.slice(0, 4).map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {amenity === 'wifi' && <Wifi className="w-3 h-3 mr-1" />}
                                  {amenity === 'parking' && <Car className="w-3 h-3 mr-1" />}
                                  {amenity === 'breakfast' && <Coffee className="w-3 h-3 mr-1" />}
                                  {amenity}
                                </Badge>
                              ))}
                              {hotel.amenities.length > 4 && (
                                <span className="text-xs text-muted-foreground">
                                  +{hotel.amenities.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {hotel.priceRange && (
                          <Badge variant="secondary" className="text-lg px-4 py-2 font-bold">
                            {hotel.priceRange}
                          </Badge>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formattedCheckIn} - {formattedCheckOut}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {guests} {parseInt(guests) === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </div>
                        <Button
                          onClick={() => handleHotelSelect(hotel)}
                          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all"
                        >
                          Select This Hotel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : !isSearching && (
            <div className="text-center py-12 text-muted-foreground">
              <Hotel className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Enter your travel details and search for hotels</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
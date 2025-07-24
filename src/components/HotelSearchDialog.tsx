import { useState } from 'react';
import { Search, Hotel, Star, MapPin, Wifi, Car, Coffee, Dumbbell, Waves, Utensils, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGooglePlacesHotelSearch, Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';
import { SearchResultSkeleton } from '@/components/skeletons/SearchResultSkeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TripLocation {
  id: string;
  name: string;
  country: string;
  state?: string;
  startDate?: Date;
  endDate?: Date;
}

interface HotelSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (hotel: HotelType, selectedLocation?: string, checkIn?: Date, checkOut?: Date) => void;
  locations: TripLocation[];
  isMultiCity: boolean;
}

export function HotelSearchDialog({ isOpen, onClose, onSelect, locations, isMultiCity }: HotelSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<HotelType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  
  const { searchHotels } = useGooglePlacesHotelSearch();

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // If no specific location selected, search in all itinerary locations
      const searchLocations = selectedLocation ? [selectedLocation] : locations.map(loc => loc.name);
      
      let allResults: HotelType[] = [];
      
      for (const location of searchLocations) {
        const results = await searchHotels({
          query: searchQuery || '',
          location: location
        });
        
        // Add location info to results
        const resultsWithLocation = results.map(hotel => ({
          ...hotel,
          searchLocation: location
        }));
        
        allResults = [...allResults, ...resultsWithLocation];
      }
      
      // Remove duplicates based on hotel ID
      const uniqueResults = allResults.filter((hotel, index, self) => 
        index === self.findIndex(h => h.id === hotel.id)
      );
      
      setHotels(uniqueResults);
    } catch (error) {
      console.error('Hotel search failed:', error);
      setHotels([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelSelect = (hotel: HotelType) => {
    onSelect(hotel, selectedLocation, checkInDate, checkOutDate);
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setHotels([]);
    setSelectedLocation('');
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();
    if (amenityLower.includes('wifi')) return <Wifi className="w-3 h-3" />;
    if (amenityLower.includes('parking') || amenityLower.includes('car')) return <Car className="w-3 h-3" />;
    if (amenityLower.includes('breakfast') || amenityLower.includes('coffee')) return <Coffee className="w-3 h-3" />;
    if (amenityLower.includes('gym') || amenityLower.includes('fitness')) return <Dumbbell className="w-3 h-3" />;
    if (amenityLower.includes('pool') || amenityLower.includes('swimming')) return <Waves className="w-3 h-3" />;
    if (amenityLower.includes('restaurant') || amenityLower.includes('dining')) return <Utensils className="w-3 h-3" />;
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Search Hotels</DialogTitle>
          <DialogDescription>
            Find the perfect accommodation for your trip
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Form */}
          <div className="space-y-4 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hotel-search">Hotel name or search term</Label>
                <Input
                  id="hotel-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Hilton, boutique hotel, luxury resort..."
                  className="mt-1"
                />
              </div>
              
              {isMultiCity && (
                <div>
                  <Label htmlFor="location-select">Location (optional)</Label>
                  <select
                    id="location-select"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">All locations</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.name}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isMultiCity && (
              <div className="flex gap-4">
                <div>
                  <Label>Check-in Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !checkInDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {checkInDate ? format(checkInDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={checkInDate}
                        onSelect={setCheckInDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Check-out Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full mt-1 justify-start text-left font-normal",
                          !checkOutDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {checkOutDate ? format(checkOutDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={checkOutDate}
                        onSelect={setCheckOutDate}
                        initialFocus
                        disabled={(date) => checkInDate ? date <= checkInDate : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={handleSearch}
                disabled={isSearching}
                className="flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {isSearching ? 'Searching...' : 'Search Hotels'}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {isSearching ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SearchResultSkeleton key={i} />
                ))}
              </div>
            ) : hotels.length > 0 ? (
              <div className="space-y-4">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg truncate">{hotel.name}</h3>
                            {hotel.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium">{hotel.rating}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{hotel.address}</span>
                          </div>

                          {hotel.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {hotel.description}
                            </p>
                          )}

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {hotel.amenities.slice(0, 4).map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {getAmenityIcon(amenity)}
                                  <span className="ml-1">{amenity}</span>
                                </Badge>
                              ))}
                              {hotel.amenities.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{hotel.amenities.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {hotel.priceRange && (
                            <Badge variant="secondary" className="w-fit">
                              {hotel.priceRange}
                            </Badge>
                          )}
                        </div>

                        <div className="flex-shrink-0 flex flex-col justify-center">
                          <Button
                            onClick={() => handleHotelSelect(hotel)}
                            className="whitespace-nowrap"
                          >
                            Select Hotel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Hotel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg mb-2">No hotels found</p>
                <p className="text-sm">Try adjusting your search terms or location</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
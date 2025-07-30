import { useState } from 'react';
import { Search, Hotel, Star, MapPin, Wifi, Car, Coffee, Dumbbell, Waves, Utensils, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGooglePlacesHotelSearch, Hotel as HotelType } from '@/hooks/useGooglePlacesHotelSearch';
import { SearchResultSkeleton } from '@/components/skeletons/SearchResultSkeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

interface HotelWithLocation extends HotelType {
  searchLocation?: string;
}

export function HotelSearchDialog({ isOpen, onClose, onSelect, locations, isMultiCity }: HotelSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<HotelWithLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  
  const { searchHotels } = useGooglePlacesHotelSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a hotel name or search term');
      return;
    }

    setIsSearching(true);
    try {
      // If no specific location selected, search in all itinerary locations
      const searchLocations = selectedLocation && selectedLocation !== 'all' ? [selectedLocation] : locations.map(loc => loc.name);
      
      if (searchLocations.length === 0) {
        toast.error('No locations available for search');
        setIsSearching(false);
        return;
      }
      
      let allResults: HotelType[] = [];
      
      for (const location of searchLocations) {
        const results = await searchHotels({
          query: searchQuery,
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
      
      if (uniqueResults.length === 0) {
        toast.info('No hotels found for the specified criteria');
      } else {
        toast.success(`Found ${uniqueResults.length} hotels`);
      }
    } catch (error) {
      console.error('Hotel search failed:', error);
      toast.error('Failed to search hotels. Please try again.');
      setHotels([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHotelSelect = (hotel: HotelType) => {
    onSelect(hotel, selectedLocation, checkInDate, checkOutDate);
    toast.success('Hotel added to your itinerary!');
    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setHotels([]);
    setSelectedLocation('all');
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setIsCheckInOpen(false);
    setIsCheckOutOpen(false);
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

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (rating >= 4.0) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };
  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckInDate(date);
    if (date) {
      setIsCheckInOpen(false);
      // If check-out date is before or equal to check-in, clear it
      if (checkOutDate && checkOutDate <= date) {
        setCheckOutDate(undefined);
      }
    }
  };

  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOutDate(date);
    if (date) {
      setIsCheckOutOpen(false);
    }
  };

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
            Find the perfect accommodation for your trip
          </DialogDescription>
        </DialogHeader>
        
        {/* Search Form */}
        <div className="space-y-6 border-b pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Search className="w-4 h-4" />
                Hotel Name or Type
              </Label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Hilton, boutique hotel, luxury resort..."
                className="bg-background/60"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="bg-background/60">
                  <SelectValue placeholder={isMultiCity ? "Select location" : locations[0]?.name || "Select location"} />
                </SelectTrigger>
                <SelectContent>
                  {isMultiCity && <SelectItem value="all">All locations</SelectItem>}
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-in Date
              </Label>
              <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/60",
                      !checkInDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {checkInDate ? format(checkInDate, "MMM dd") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkInDate}
                    onSelect={handleCheckInSelect}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-out Date
              </Label>
              <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background/60",
                      !checkOutDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {checkOutDate ? format(checkOutDate, "MMM dd") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={checkOutDate}
                    onSelect={handleCheckOutSelect}
                    initialFocus
                    disabled={(date) => checkInDate ? date <= checkInDate : false}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Search className="w-5 h-5 mr-2" />
            {isSearching ? 'Searching Hotels...' : 'Search Hotels'}
          </Button>
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
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-primary" />
                  {hotels.length} Available Hotels
                </h3>
                <Badge variant="secondary" className="px-3 py-1">
                  {selectedLocation && selectedLocation !== 'all' ? selectedLocation : 'All locations'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">{hotel.name}</h3>
                            {hotel.rating && (
                              <Badge className={cn("text-xs font-medium", getRatingColor(hotel.rating))}>
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {hotel.rating}
                              </Badge>
                            )}
                            {hotel.searchLocation && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {hotel.searchLocation}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{hotel.address}</span>
                          </div>

                          {hotel.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {hotel.description}
                            </p>
                          )}

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
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
                            className="whitespace-nowrap bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all"
                          >
                            Select Hotel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Hotel className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Enter your search criteria and find hotels</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
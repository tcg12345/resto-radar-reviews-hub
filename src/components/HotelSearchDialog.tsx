import { useState } from 'react';
import { Search, Hotel, Star, MapPin, Wifi, Car, Coffee, Dumbbell, Waves, Utensils, Calendar, ArrowLeft, X } from 'lucide-react';
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
import { useAmadeusApi, Hotel as HotelType } from '@/hooks/useAmadeusApi';
import { SearchResultSkeleton } from '@/components/skeletons/SearchResultSkeleton';
import { HotelStayDetailsDialog, StayDetails } from '@/components/HotelStayDetailsDialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';

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
  onSelect: (stayDetails: StayDetails) => void;
  locations: TripLocation[];
  isMultiCity: boolean;
  // Add itinerary context
  itineraryStartDate?: Date;
  itineraryEndDate?: Date;
  itineraryDuration?: number;
  wasCreatedWithLengthOfStay?: boolean;
}

interface HotelWithLocation extends HotelType {
  searchLocation?: string;
}

export function HotelSearchDialog({ isOpen, onClose, onSelect, locations, isMultiCity, itineraryStartDate, itineraryEndDate, itineraryDuration, wasCreatedWithLengthOfStay }: HotelSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<HotelWithLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [checkInDate, setCheckInDate] = useState<Date>();
  const [checkOutDate, setCheckOutDate] = useState<Date>();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelType | null>(null);
  const [showStayDetails, setShowStayDetails] = useState(false);
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(!isMobile);
  
  const { searchHotels, hotelAutocomplete, getLocationScore } = useAmadeusApi();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a hotel name or search term');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
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
          location: location,
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          guests: 1, // Default to 1 guest, can be made configurable
          priceRange: undefined // No price filter by default
        });
        
        // Add location info to results and filter by search query
        const resultsWithLocation = results
          .filter(hotel => 
            hotel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hotel.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            hotel.amenities?.some(amenity => amenity.toLowerCase().includes(searchQuery.toLowerCase()))
          )
          .map(hotel => ({
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
        toast.success(`Found ${uniqueResults.length} hotels with enhanced Amadeus data`);
        setShowResults(true); // Show results popup
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
    setSelectedHotel(hotel);
    setShowResults(false);
    setShowStayDetails(true);
  };

  const handleStayDetailsConfirm = (stayDetails: StayDetails) => {
    onSelect(stayDetails);
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
    setShowResults(false);
    setSelectedHotel(null);
    setShowStayDetails(false);
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
    console.log('handleCheckInSelect called with:', date);
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

if (isMobile) {
  return (
    <>
      <Drawer open={isOpen && !showResults} onOpenChange={handleClose}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full h-[85vh] flex flex-col">
            {/* Header Section */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-background via-background to-background/95 px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <DrawerTitle className="text-xl font-bold text-foreground">Hotel Search</DrawerTitle>
                  <DrawerDescription className="text-sm text-muted-foreground font-medium">Find the perfect accommodation for your trip</DrawerDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Prominent Search Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search hotels by name or type..."
                    className="pl-10 h-12 rounded-full border-2 border-border/20 bg-muted/10 shadow-sm focus:shadow-md transition-all"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 shadow-sm"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6">
              {/* Location Filter Only */}
              <div className="space-y-4 pb-6">
                {/* Location Card */}
                <Card className="p-4 bg-muted/5 border-muted/20 shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <MapPin className="w-4 h-4 text-primary" />
                      Location
                    </Label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger className="bg-background border-border/30 focus:border-primary/50">
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
                </Card>
              </div>
            </div>

            {/* Sticky Bottom CTA */}
            <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-background/95 p-6 border-t border-border/20">
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="w-full h-12 text-base font-semibold rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Hotels
                  </>
                )}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Results Drawer */}
      <Drawer open={showResults} onOpenChange={() => setShowResults(false)}>
        <DrawerContent className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="w-full">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 via-background to-background/80 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowResults(false)}
                    className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="space-y-0.5">
                    <DrawerTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Hotel className="w-4 h-4 text-primary" />
                      </div>
                      {hotels.length} Available Hotels
                    </DrawerTitle>
                    <DrawerDescription className="text-xs text-muted-foreground">
                      {selectedLocation && selectedLocation !== 'all' ? `Hotels in ${selectedLocation}` : 'Hotels in all locations'}
                    </DrawerDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              {/* Results Content */}
              <div className="flex-1 overflow-y-auto pt-2">
                {isSearching ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <SearchResultSkeleton key={i} />
                    ))}
                  </div>
                ) : hotels.length > 0 ? (
                  <div className="space-y-3">
                    {hotels.map((hotel) => (
                      <Card key={hotel.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                        <CardContent className={cn("p-6", isMobile && "p-4")}>
                          <div className={cn("flex gap-4", isMobile && "flex-col gap-3")}>
                            <div className="flex-1 space-y-3 min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className={cn("font-semibold text-lg", isMobile && "text-base")}>{hotel.name}</h3>
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

                              {hotel.description && !isMobile && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {hotel.description}
                                </p>
                              )}

                              {hotel.amenities && hotel.amenities.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {hotel.amenities.slice(0, isMobile ? 3 : 4).map((amenity, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {getAmenityIcon(amenity)}
                                      <span className="ml-1">{amenity}</span>
                                    </Badge>
                                  ))}
                                  {hotel.amenities.length > (isMobile ? 3 : 4) && (
                                    <Badge variant="outline" className="text-xs">
                                      +{hotel.amenities.length - (isMobile ? 3 : 4)} more
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

                            <div className={cn("flex-shrink-0 flex flex-col justify-center", isMobile && "w-full")}>
                              <Button
                                onClick={() => handleHotelSelect(hotel)}
                                className={cn("whitespace-nowrap bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all", isMobile && "w-full")}
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
                    <Hotel className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No hotels found</p>
                    <Button variant="outline" onClick={() => setShowResults(false)} className="mt-4">
                      Search Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Hotel Stay Details Dialog - Mobile Version */}
      {selectedHotel && (
        <HotelStayDetailsDialog
          isOpen={showStayDetails}
          onClose={() => {
            setShowStayDetails(false);
            setSelectedHotel(null);
          }}
          onConfirm={handleStayDetailsConfirm}
          hotel={selectedHotel}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          selectedLocation={selectedLocation}
          itineraryStartDate={itineraryStartDate}
          itineraryEndDate={itineraryEndDate}
          itineraryDuration={itineraryDuration}
          wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
        />
      )}
    </>
  );
}

return (
    <>
      {/* Main Search Dialog */}
      <Dialog open={isOpen && !showResults} onOpenChange={handleClose}>
        <DialogContent
          className={cn(
            "sm:max-w-[900px] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20",
            isMobile ? "h-[75vh] max-h-[75vh] p-3 rounded-2xl" : "max-h-[90vh] p-6"
          )}
        >
          <DialogHeader className={cn(isMobile ? "space-y-1 pb-2" : "space-y-3 pb-4") }>
            <div className="flex items-center justify-between">
              <DialogTitle className={cn("flex items-center gap-3", isMobile ? "text-lg" : "text-2xl") }>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Hotel className="w-6 h-6 text-primary" />
                </div>
                Hotel Search
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!isMobile && (
              <DialogDescription className="text-lg">
                Find the perfect accommodation for your trip
              </DialogDescription>
            )}
          </DialogHeader>
        
        {/* Compact Mobile Search Bar */}
        {isMobile && (
          <div className="space-y-2 border-b pb-3">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search hotels..."
                className="h-10"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="h-10 px-4"
              >
                <Search className="w-4 h-4 mr-1" />
                Go
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                {showFilters ? "Hide filters" : "Show filters"}
              </Button>
            </div>
          </div>
        )}
        
        {/* Desktop & Mobile Filters */}
        <div className={cn("space-y-6", isMobile ? (showFilters ? "border-b pb-3" : "hidden") : "border-b pb-6")}>
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
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
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
                <PopoverContent className="w-auto p-0 z-[9999]" align="start">
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

          {!isMobile && (
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="w-full h-12 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
            >
              <Search className="w-5 h-5 mr-2" />
              {isSearching ? 'Searching Hotels...' : 'Search Hotels'}
            </Button>
          )}
        </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={() => setShowResults(false)}>
        <DialogContent
          className={cn(
            "sm:max-w-[900px] overflow-hidden flex flex-col bg-gradient-to-br from-background to-accent/20",
            isMobile ? "h-[80vh] max-h-[80vh] p-3 rounded-2xl" : "max-h-[90vh] p-6"
          )}
        >
          <DialogHeader className={cn(isMobile ? "space-y-1 pb-2" : "space-y-3 pb-4")}>
            <div className="flex items-center justify-between">
              <DialogTitle className={cn("flex items-center gap-3", isMobile ? "text-lg" : "text-2xl")}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowResults(false)}
                  className="h-8 w-8 p-0 mr-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Hotel className="w-6 h-6 text-primary" />
                </div>
                {hotels.length} Available Hotels
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
            {!isMobile && (
              <DialogDescription className="text-lg">
                {selectedLocation && selectedLocation !== 'all' ? `Hotels in ${selectedLocation}` : 'Hotels in all locations'}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Results Content */}
          <div className="flex-1 overflow-y-auto pt-2">
            {isSearching ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <SearchResultSkeleton key={i} />
                ))}
              </div>
            ) : hotels.length > 0 ? (
              <div className="space-y-3">
                {hotels.map((hotel) => (
                  <Card key={hotel.id} className="group cursor-pointer border-2 border-transparent hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-gradient-to-r from-card to-card/90">
                    <CardContent className={cn("p-6", isMobile && "p-4")}>
                      <div className={cn("flex gap-4", isMobile && "flex-col gap-3")}>
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className={cn("font-semibold text-lg", isMobile && "text-base")}>{hotel.name}</h3>
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

                          {hotel.description && !isMobile && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {hotel.description}
                            </p>
                          )}

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {hotel.amenities.slice(0, isMobile ? 3 : 4).map((amenity, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {getAmenityIcon(amenity)}
                                  <span className="ml-1">{amenity}</span>
                                </Badge>
                              ))}
                              {hotel.amenities.length > (isMobile ? 3 : 4) && (
                                <Badge variant="outline" className="text-xs">
                                  +{hotel.amenities.length - (isMobile ? 3 : 4)} more
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

                        <div className={cn("flex-shrink-0 flex flex-col justify-center", isMobile && "w-full")}>
                          <Button
                            onClick={() => handleHotelSelect(hotel)}
                            className={cn("whitespace-nowrap bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md group-hover:shadow-lg transition-all", isMobile && "w-full")}
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
                <Hotel className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No hotels found</p>
                <Button variant="outline" onClick={() => setShowResults(false)} className="mt-4">
                  Search Again
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hotel Stay Details Dialog - Works for both mobile and desktop */}
      {selectedHotel && (
        <HotelStayDetailsDialog
          isOpen={showStayDetails}
          onClose={() => {
            setShowStayDetails(false);
            setSelectedHotel(null);
          }}
          onConfirm={handleStayDetailsConfirm}
          hotel={selectedHotel}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          selectedLocation={selectedLocation}
          itineraryStartDate={itineraryStartDate}
          itineraryEndDate={itineraryEndDate}
          itineraryDuration={itineraryDuration}
          wasCreatedWithLengthOfStay={wasCreatedWithLengthOfStay}
        />
      )}
    </>
  );
}
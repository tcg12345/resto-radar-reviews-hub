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
import { useGooglePlacesHotelSearch } from '@/hooks/useGooglePlacesHotelSearch';
import { AmadeusCitySearch } from '@/components/AmadeusCitySearch';

import { toast } from 'sonner';

interface LocationSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface HotelSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (hotel: any) => void;
  itineraryLocation?: string;
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

export function HotelSearchDialog({ isOpen, onClose, onSelect, itineraryLocation }: HotelSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchHotels } = useGooglePlacesHotelSearch();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a hotel name or location to search');
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = {
        query: searchQuery.trim(),
        location: itineraryLocation,
      };

      const results = await searchHotels(searchParams);
      setHotels(results);

      if (results.length === 0) {
        toast.info('No hotels found matching your search');
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
    setSearchQuery('');
    setHotels([]);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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
            Search for hotels {itineraryLocation ? `in ${itineraryLocation} or anywhere else` : 'anywhere in the world'}
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="space-y-4 border-b pb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Hotels
            </Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by hotel name or location (e.g., Marriott, Hilton, luxury hotels Paris)"
                className="bg-background/60 flex-1"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg px-6"
              >
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {itineraryLocation && (
              <p className="text-xs text-muted-foreground">
                💡 Leave blank to search in {itineraryLocation}, or specify a different location
              </p>
            )}
          </div>
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
                  Search: "{searchQuery}"
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
                          {hotel.website && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              View Details
                            </span>
                          )}
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
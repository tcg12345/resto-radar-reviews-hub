import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LocationPermission } from '@/components/LocationPermission';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RestaurantSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (restaurant: any) => void;
}

interface SearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  vicinity?: string;
  rating?: number;
  price_level?: number;
  types?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: any[];
  formatted_phone_number?: string;
  website?: string;
}

export function RestaurantSearchDialog({ isOpen, onClose, onSelect }: RestaurantSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const { location, requestPermission, formatLocation } = useLocation();

  // Auto-request location on dialog open
  useEffect(() => {
    if (isOpen && !locationQuery && !location) {
      requestPermission().then((granted) => {
        if (granted && location) {
          setLocationQuery(formatLocation(location));
        }
      });
    }
  }, [isOpen, locationQuery, location, requestPermission, formatLocation]);

  // Update location query when location is obtained
  useEffect(() => {
    if (location && !locationQuery) {
      setLocationQuery(formatLocation(location));
    }
  }, [location, locationQuery, formatLocation]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: searchQuery,
          location: locationQuery,
          type: 'search'
        }
      });

      if (error) throw error;

      if (data?.results) {
        // Filter for restaurants only
        const restaurants = data.results.filter((place: any) => 
          place.types?.includes('restaurant') || 
          place.types?.includes('food') ||
          place.types?.includes('meal_takeaway') ||
          place.types?.includes('cafe')
        );
        setSearchResults(restaurants);
      }
    } catch (error) {
      console.error('Error searching restaurants:', error);
      toast.error('Failed to search restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDetails = async (placeId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId,
          type: 'details'
        }
      });

      if (error) throw error;

      if (data?.result) {
        setSelectedResult(data.result);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      toast.error('Failed to get restaurant details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelect = () => {
    if (selectedResult) {
      onSelect(selectedResult);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    onClose();
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderPriceLevel = (level: number) => {
    return Array.from({ length: 4 }, (_, i) => (
      <span key={i} className={i < level ? 'text-green-600' : 'text-gray-300'}>
        $
      </span>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Restaurants</DialogTitle>
          <DialogDescription>
            Find restaurants to add to your itinerary
          </DialogDescription>
        </DialogHeader>

        {!selectedResult ? (
          <div className="space-y-4">
            {/* Search Inputs */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Search for restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isLoading || !searchQuery.trim()}
                  className="flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  {isLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <Input
                  placeholder={location ? formatLocation(location) : "Enter location..."}
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  className="w-full"
                />
                <LocationPermission 
                  showInline={true}
                  onLocationGranted={(currentLocation) => {
                    if (!locationQuery) {
                      setLocationQuery(formatLocation(currentLocation));
                    }
                  }}
                />
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <h3 className="font-medium text-sm text-muted-foreground">
                  Search Results ({searchResults.length})
                </h3>
                {searchResults.map((result) => (
                  <Card 
                    key={result.place_id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleGetDetails(result.place_id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">{result.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {result.formatted_address || result.vicinity}
                          </CardDescription>
                        </div>
                        {result.rating && (
                          <div className="flex items-center gap-1 text-sm">
                            <div className="flex">
                              {renderStars(result.rating)}
                            </div>
                            <span className="font-medium">{result.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {result.price_level && (
                          <div className="flex items-center gap-1">
                            <span>Price:</span>
                            {renderPriceLevel(result.price_level)}
                          </div>
                        )}
                        {result.types && (
                          <Badge variant="secondary" className="text-xs">
                            {result.types.includes('restaurant') ? 'Restaurant' : 
                             result.types.includes('cafe') ? 'Cafe' : 
                             result.types.includes('food') ? 'Food' : 'Dining'}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No restaurants found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Restaurant Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedResult.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {selectedResult.formatted_address || selectedResult.vicinity}
                    </CardDescription>
                  </div>
                  {selectedResult.rating && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {renderStars(selectedResult.rating)}
                      </div>
                      <span className="font-medium">{selectedResult.rating}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  {selectedResult.price_level && (
                    <div className="flex items-center gap-1">
                      <span>Price:</span>
                      {renderPriceLevel(selectedResult.price_level)}
                    </div>
                  )}
                  <Badge variant="secondary">Restaurant</Badge>
                </div>

                {(selectedResult.formatted_phone_number || selectedResult.website) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {selectedResult.formatted_phone_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>{selectedResult.formatted_phone_number}</span>
                        </div>
                      )}
                      {selectedResult.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <ExternalLink className="w-4 h-4" />
                          <a 
                            href={selectedResult.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setSelectedResult(null)}
              >
                Back to Search
              </Button>
              <Button onClick={handleSelect}>
                Select Restaurant
              </Button>
            </div>
          </div>
        )}

        {loadingDetails && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading details...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
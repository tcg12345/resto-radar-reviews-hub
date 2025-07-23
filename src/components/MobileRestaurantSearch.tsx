import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Star, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    open_now: boolean;
  };
  fallbackCuisine?: string;
}

interface MobileRestaurantSearchProps {
  onPlaceSelect?: (place: GooglePlaceResult) => void;
}

export function MobileRestaurantSearch({ onPlaceSelect }: MobileRestaurantSearchProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [liveResults, setLiveResults] = useState<GooglePlaceResult[]>([]);
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => console.log('Location access denied:', error)
      );
    }
  }, []);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowLiveResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.length > 2) {
        performLiveSearch();
      } else {
        setLiveResults([]);
        setShowLiveResults(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, locationQuery]);

  const performLiveSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    
    setIsLiveSearching(true);
    try {
      const searchParams: any = {
        query: locationQuery.trim() ? `${searchQuery} in ${locationQuery}` : searchQuery,
        type: 'search',
        radius: 25000
      };

      if (userLocation && !locationQuery.trim()) {
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000;
      }

      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });

      if (error) {
        setLiveResults([]);
        setShowLiveResults(false);
        return;
      }

      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        const resultsWithFallback = data.results.slice(0, 5).map((result: any) => ({
          ...result,
          fallbackCuisine: result.types.find((type: string) => 
            !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
          )?.replace(/_/g, ' ') || 'Restaurant'
        }));
        setLiveResults(resultsWithFallback);
        setShowLiveResults(true);
      } else {
        setLiveResults([]);
        setShowLiveResults(false);
      }
    } catch (error) {
      setLiveResults([]);
      setShowLiveResults(false);
    } finally {
      setIsLiveSearching(false);
    }
  };

  const handleSearch = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    setShowLiveResults(false);
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const searchQuery_final = locationQuery.trim() ? `${searchQuery} in ${locationQuery}` : searchQuery;
      const searchParams: any = {
        query: searchQuery_final,
        type: 'search',
        radius: 25000
      };

      if (userLocation && !locationQuery.trim()) {
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000;
      }

      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });

      if (error) throw error;

      if (data.status === 'OK') {
        const results = data.results || [];
        const resultsWithFallback = results.map((result: any) => ({
          ...result,
          fallbackCuisine: result.types.find((type: string) => 
            !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
          )?.replace(/_/g, ' ') || 'Restaurant'
        }));
        setSearchResults(resultsWithFallback);
      } else {
        toast.error('No results found');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowLiveResults(false);
    setSearchResults([]);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  const handlePlaceClick = (place: GooglePlaceResult) => {
    setShowLiveResults(false);
    if (onPlaceSelect) {
      onPlaceSelect(place);
    }
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return null;
    return '$'.repeat(priceLevel);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search restaurants..." 
            value={searchQuery} 
            onChange={e => {
              setSearchQuery(e.target.value);
              if (e.target.value.length > 2) {
                setShowLiveResults(true);
              } else {
                setShowLiveResults(false);
              }
            }} 
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }} 
            className="pl-9 pr-9 h-11 bg-background border-border rounded-lg" 
          />
          {searchQuery && (
            <button 
              onClick={clearSearch} 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Live Search Results */}
          {showLiveResults && (liveResults.length > 0 || isLiveSearching) && (
            <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 z-50">
              <div className="max-h-64 overflow-y-auto">
                {isLiveSearching ? (
                  <div className="p-3 text-center">
                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </div>
                ) : (
                  liveResults.map((place) => (
                    <div
                      key={place.place_id}
                      className="p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                      onClick={() => handlePlaceClick(place)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{place.name}</h4>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {place.fallbackCuisine}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {place.formatted_address.split(',').slice(0, 2).join(',')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs font-medium">{place.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location and Search Button */}
      <div className="flex gap-2">
        <Input 
          placeholder="Location (optional)" 
          value={locationQuery} 
          onChange={e => setLocationQuery(e.target.value)} 
          className="flex-1 h-11 bg-background border-border rounded-lg"
        />
        <Button onClick={handleSearch} disabled={isLoading} className="h-11 px-4">
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {searchResults.length} restaurants found
          </h3>
          <div className="space-y-2">
            {searchResults.map((place) => (
              <Card key={place.place_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePlaceClick(place)}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{place.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{place.fallbackCuisine}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground truncate">
                          {place.formatted_address.split(',').slice(0, 2).join(',')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      {place.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{place.rating}</span>
                          {place.user_ratings_total && (
                            <span className="text-xs text-muted-foreground">({place.user_ratings_total})</span>
                          )}
                        </div>
                      )}
                      {place.price_level && (
                        <Badge variant="outline" className="text-xs">
                          {getPriceDisplay(place.price_level)}
                        </Badge>
                      )}
                      {place.opening_hours?.open_now !== undefined && (
                        <Badge variant={place.opening_hours.open_now ? "default" : "secondary"} className="text-xs">
                          {place.opening_hours.open_now ? 'Open' : 'Closed'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
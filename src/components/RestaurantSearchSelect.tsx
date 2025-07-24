import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Star, DollarSign, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
  }>;
  types: string[];
}

interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

interface RestaurantSearchSelectProps {
  onRestaurantSelect: (restaurant: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RestaurantSearchSelect({ 
  onRestaurantSelect, 
  placeholder = "Search for a restaurant...",
  disabled = false 
}: RestaurantSearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [skipSearch, setSkipSearch] = useState(false); // Flag to prevent auto-search
  
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search function
  useEffect(() => {
    // Skip search if it's being set programmatically
    if (skipSearch) {
      setSkipSearch(false);
      return;
    }
    
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: `${query} restaurant`,
          type: 'search'
        }
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search restaurants');
        return;
      }

      if (data.status === 'OK') {
        setSearchResults(data.results || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search restaurants');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRestaurantSelect = async (place: PlaceResult) => {
    setIsSearching(true);
    try {
      // Get detailed place information
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });

      if (error) {
        console.error('Details error:', error);
        toast.error('Failed to get restaurant details');
        return;
      }

      if (data.status === 'OK') {
        const details: PlaceDetails = data.result;
        onRestaurantSelect(details);
        
        // Set search query without triggering search
        setSkipSearch(true);
        setSearchQuery(details.name);
        setShowResults(false);
        toast.success('Restaurant selected successfully!');
      }
    } catch (error) {
      console.error('Details error:', error);
      toast.error('Failed to get restaurant details');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleRestaurantSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getCuisineType = (types: string[]) => {
    const cuisineTypes = types.filter(type => 
      !['establishment', 'food', 'point_of_interest', 'restaurant'].includes(type)
    );
    return cuisineTypes[0] || 'Restaurant';
  };

  const formatCuisineType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={searchRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSkipSearch(false); // Reset flag when user types
            setSearchQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10"
          disabled={disabled}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute z-[9999] w-full mt-1 max-h-80 overflow-y-auto shadow-2xl backdrop-blur-sm bg-background">
          <CardContent className="p-0">
            {searchResults.map((place, index) => (
              <div
                key={place.place_id}
                className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                  index === selectedIndex ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleRestaurantSelect(place)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{place.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {place.formatted_address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {formatCuisineType(getCuisineType(place.types))}
                      </Badge>
                      {place.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-xs font-medium">{place.rating}</span>
                        </div>
                      )}
                      {place.price_level && (
                        <div className="flex items-center">
                          {Array.from({ length: place.price_level }, (_, i) => (
                            <DollarSign key={i} className="h-3 w-3 text-green-600" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
        <Card className="absolute z-[9999] w-full mt-1 shadow-2xl backdrop-blur-sm bg-background">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No restaurants found. Try a different search term.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
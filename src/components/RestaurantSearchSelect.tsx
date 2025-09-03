import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, Star, DollarSign, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();
  const isSelectingRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Don't search if we're in the middle of selecting
    if (isSelectingRef.current) {
      return;
    }
    
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      setIsSearching(false);
      return;
    }

    // Cancel previous request and timeout
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout with longer delay for better batching
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500); // Increased from 300ms to 500ms to reduce API calls
  }, [searchQuery]);

  const performSearch = useCallback(async (query: string) => {
    if (isSelectingRef.current) return;
    
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setIsSearching(true);
    console.log(`Starting search for: "${query}"`);
    
    try {
      const startTime = Date.now();
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: `${query} restaurant`,
          type: 'search'
        }
      });
      const duration = Date.now() - startTime;
      console.log(`Search completed in ${duration}ms`);

      // Check if request was aborted
      if (controller.signal.aborted) {
        console.log('Search was aborted');
        return;
      }

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search restaurants. Please try again.');
        return;
      }

      console.log('Search response:', data);
      if (data.status === 'OK') {
        console.log(`Found ${data.results?.length || 0} results`);
        setSearchResults(data.results || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } else if (data.status === 'ZERO_RESULTS') {
        console.log('No results found');
        setSearchResults([]);
        setShowResults(true);
      } else {
        console.warn('Unexpected response status:', data.status);
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      if (controller.signal.aborted) {
        console.log('Search was aborted due to error');
        return;
      }
      console.error('Search error:', error);
      toast.error('Search failed. Please check your connection and try again.');
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  const handleRestaurantSelect = useCallback(async (place: PlaceResult) => {
    // Prevent concurrent selections and searches
    if (isSelectingRef.current) return;
    
    isSelectingRef.current = true;
    setIsSearching(true);
    setShowResults(false);
    
    // Cancel any pending searches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

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
        
        // Update UI state
        setSearchQuery(details.name);
        setSearchResults([]);
        
        // Call the callback
        onRestaurantSelect(details);
        toast.success('Restaurant selected successfully!');
      }
    } catch (error) {
      console.error('Details error:', error);
      toast.error('Failed to get restaurant details');
    } finally {
      setIsSearching(false);
      // Small delay before allowing new selections/searches
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 100);
    }
  }, [onRestaurantSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSelectingRef.current) return;
    setSearchQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
  }, [showResults, searchResults, selectedIndex, handleRestaurantSelect]);

  const handleFocus = useCallback(() => {
    if (searchResults.length > 0 && !isSelectingRef.current) {
      setShowResults(true);
    }
  }, [searchResults.length]);

  const handleBlur = useCallback(() => {
    // Delay hiding results to allow clicks
    setTimeout(() => {
      if (!isSelectingRef.current) {
        setShowResults(false);
      }
    }, 150);
  }, []);

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
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-10 pr-10"
          disabled={disabled}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto shadow-lg border bg-background">
          <CardContent className="p-0">
            {searchResults.map((place, index) => (
              <div
                key={place.place_id}
                className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                  index === selectedIndex ? 'bg-muted/50' : ''
                }`}
                onMouseDown={(e) => {
                  // Prevent blur event from firing before click
                  e.preventDefault();
                }}
                onClick={() => handleRestaurantSelect(place)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{place.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate">
                        {place.formatted_address}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
        <Card className="absolute z-50 w-full mt-1 shadow-lg border bg-background">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No restaurants found. Try a different search term.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
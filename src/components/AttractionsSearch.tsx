import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Star, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTripAdvisorApi } from '@/hooks/useTripAdvisorApi';
import { supabase } from '@/integrations/supabase/client';

interface Attraction {
  id: string;
  name: string;
  address: string;
  category?: string;
  placeType?: 'hotel' | 'restaurant' | 'attraction' | 'museum' | 'park' | 'monument' | 'shopping' | 'entertainment' | 'other';
  rating?: number;
  numReviews?: number;
  photo?: string;
  ranking?: string;
  website?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
}

interface AttractionsSearchProps {
  value?: Attraction | null;
  onChange?: (attraction: Attraction | null) => void;
  placeholder?: string;
  className?: string;
  location?: string;
}

export function AttractionsSearch({ 
  value, 
  onChange, 
  placeholder = "Search for attractions, museums, landmarks...",
  className,
  location 
}: AttractionsSearchProps) {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { searchLocations, isLoading } = useTripAdvisorApi();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setAttractions([]);
      setShowResults(false);
      return;
    }

    const searchTimer = setTimeout(async () => {
      try {
        // Combine location with search query for better results
        const fullQuery = location ? `${searchQuery} ${location}` : searchQuery;
        const results = await searchLocations(fullQuery);
        
        // For now, show all results to debug the filtering issue
        // The TripAdvisor API might not be returning the expected category structure
        console.log('Search results from TripAdvisor:', results);
        
        // Show all results but prefer actual attractions/museums/landmarks when available
        const filteredResults = results.filter(location => {
          // First, log what categories and types we're getting
          console.log('Location categories:', location.subcategory, 'establishments:', location.establishment_types);
          
          const categories = location.subcategory?.map(sub => sub.name.toLowerCase()) || [];
          const establishments = location.establishment_types?.map(est => est.name.toLowerCase()) || [];
          const locationName = location.name.toLowerCase();
          
          // Include if it matches attraction keywords OR has relevant categories
          const hasAttractionKeywords = locationName.includes('museum') || 
            locationName.includes('louvre') || 
            locationName.includes('tower') || 
            locationName.includes('palace') || 
            locationName.includes('cathedral') || 
            locationName.includes('gallery') ||
            locationName.includes('park') ||
            locationName.includes('monument');
          
          const hasAttractionCategories = categories.some(cat => 
            cat.includes('attraction') || 
            cat.includes('museum') || 
            cat.includes('landmark') || 
            cat.includes('monument') || 
            cat.includes('park') || 
            cat.includes('gallery') || 
            cat.includes('historic') ||
            cat.includes('cultural') ||
            cat.includes('zoo') ||
            cat.includes('aquarium') ||
            cat.includes('theater') ||
            cat.includes('entertainment')
          ) || establishments.some(est => 
            est.includes('attraction') || 
            est.includes('museum') || 
            est.includes('landmark')
          );
          
          // For debugging, include everything for now but prefer attractions
          return hasAttractionKeywords || hasAttractionCategories || true;
        });

        // Transform results and categorize them with AI
        const transformedAttractions: Attraction[] = await Promise.all(
          filteredResults.slice(0, 10).map(async (location) => {
            const basicAttraction = {
              id: location.location_id,
              name: location.name,
              address: location.address_obj?.address_string || '',
              category: location.subcategory?.[0]?.localized_name || location.establishment_types?.[0]?.localized_name || 'Attraction',
              rating: location.rating ? parseFloat(location.rating) : undefined,
              numReviews: location.num_reviews ? parseInt(location.num_reviews) : undefined,
              photo: location.photo?.images?.medium?.url || location.photo?.images?.small?.url,
              ranking: location.ranking_data?.ranking_string || location.ranking,
              website: location.website,
              phone: location.phone,
              latitude: location.latitude ? parseFloat(location.latitude) : undefined,
              longitude: location.longitude ? parseFloat(location.longitude) : undefined,
            };

            // Use AI to categorize the place
            try {
              const { data: categorization } = await supabase.functions.invoke('ai-place-categorizer', {
                body: {
                  name: location.name,
                  category: basicAttraction.category,
                  address: basicAttraction.address,
                }
              });

              if (categorization) {
                return {
                  ...basicAttraction,
                  placeType: categorization.type,
                  category: categorization.displayCategory,
                };
              }
            } catch (error) {
              console.error('Failed to categorize place:', error);
            }

            return basicAttraction;
          })
        );

        setAttractions(transformedAttractions);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching attractions:', error);
        setAttractions([]);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, location, searchLocations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAttractionSelect = (attraction: Attraction) => {
    setSearchQuery(attraction.name);
    setShowResults(false);
    onChange?.(attraction);
  };

  const handleClearSelection = () => {
    setSearchQuery('');
    onChange?.(null);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (attractions.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn("pl-10 pr-10", className)}
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showResults && attractions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {attractions.map((attraction) => (
            <Card
              key={attraction.id}
              onClick={() => handleAttractionSelect(attraction)}
              className="m-2 cursor-pointer hover:bg-accent transition-colors border-0 shadow-sm"
            >
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {attraction.photo && (
                    <div className="flex-shrink-0">
                      <img
                        src={attraction.photo}
                        alt={attraction.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{attraction.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{attraction.address}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {attraction.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{attraction.rating}</span>
                            {attraction.numReviews && (
                              <span className="text-xs text-muted-foreground">({attraction.numReviews})</span>
                            )}
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {attraction.category}
                        </Badge>
                      </div>
                    </div>
                    {attraction.ranking && (
                      <div className="flex items-center gap-1 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{attraction.ranking}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showResults && searchQuery.length >= 2 && attractions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <div className="text-sm text-muted-foreground text-center">
            No attractions found. Try searching for museums, landmarks, or popular destinations.
          </div>
        </div>
      )}
    </div>
  );
}
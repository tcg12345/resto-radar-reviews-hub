
import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Heart, Phone, Globe, Navigation, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { GlobalSearchMap } from '@/components/GlobalSearchMap';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { RestaurantProfileModal } from '@/components/RestaurantProfileModal';
import { DiscoverPage } from '@/pages/DiscoverPage';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
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
  opening_hours?: {
    open_now: boolean;
  };
}

interface PlaceDetails extends GooglePlaceResult {
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

export type SearchType = 'name' | 'cuisine' | 'description';

export default function UnifiedSearchPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('description');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'smart' | 'recommendations'>('global');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }
  }, []);

  // Generate location suggestions
  const generateLocationSuggestions = async (input: string) => {
    if (input.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('location-suggestions', {
        body: { input, limit: 5 }
      });

      if (error) throw error;

      setLocationSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      setLocationSuggestions([]);
    }
  };

  const handleLocationSuggestionClick = (suggestion: any) => {
    setLocationQuery(suggestion.description);
    setShowLocationSuggestions(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      // Use locationQuery if provided, otherwise fall back to user location
      let searchLocation = undefined;
      if (locationQuery.trim()) {
        searchLocation = locationQuery;
      } else if (userLocation) {
        searchLocation = `${userLocation.lat},${userLocation.lng}`;
      }

      // Construct a more specific search query
      let specificQuery = searchQuery.trim();
      if (locationQuery.trim()) {
        // When location is specified, make query more specific to that location
        specificQuery = `${searchQuery} in ${locationQuery}`;
      }

      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: specificQuery,
          type: 'search',
          location: searchLocation,
          searchType: searchType,
          radius: locationQuery.trim() ? 10000 : 50000, // Smaller radius when location specified
        }
      });

      if (error) throw error;

      if (data.status === 'OK') {
        setSearchResults(data.results || []);
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

  const handlePlaceClick = async (place: GooglePlaceResult) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });

      if (error) throw error;

      if (data.status === 'OK') {
        setSelectedPlace(data.result);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
      toast.error('Failed to load restaurant details');
    }
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  const getPhotoUrl = (photoReference: string) => {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Search & Discover Restaurants
        </h1>
        <p className="text-muted-foreground text-lg">
          Find restaurants worldwide with multiple search methods and personalized recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'global' | 'smart' | 'recommendations')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Restaurant Search</TabsTrigger>
          <TabsTrigger value="smart">Smart Discovery</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Personalized Recommendations - Show when no search results */}
          {searchResults.length === 0 && !isLoading && (
            <div className="mb-8">
              <PersonalizedRecommendations />
            </div>
          )}

          {/* Search Section */}
          <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Search by:
                  </label>
                  <Select value={searchType} onValueChange={(value) => setSearchType(value as SearchType)}>
                    <SelectTrigger className="w-[200px] h-10 bg-background/50 border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Restaurant Name</SelectItem>
                      <SelectItem value="cuisine">Cuisine Type</SelectItem>
                      <SelectItem value="description">Description/Keywords</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      {searchType === 'name' ? 'Restaurant name' : 
                       searchType === 'cuisine' ? 'Cuisine type' : 
                       'Restaurant or cuisine'}
                    </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder={searchType === 'name' ? 'e.g., "The Cottage", "Joe\'s Pizza"' :
                                 searchType === 'cuisine' ? 'e.g., "Italian", "Chinese", "Mexican"' :
                                 'Search for restaurants by name, cuisine, or location...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 h-12"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Location (optional)
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="City or neighborhood"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        generateLocationSuggestions(e.target.value);
                        setShowLocationSuggestions(e.target.value.length > 1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch();
                          setShowLocationSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowLocationSuggestions(false);
                        }
                      }}
                      onFocus={() => locationQuery.length > 1 && setShowLocationSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                      className="pl-10 h-12"
                    />
                    
                    {/* Location Suggestions Dropdown */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                            onClick={() => handleLocationSuggestionClick(suggestion)}
                          >
                            <div className="font-medium text-sm">{suggestion.mainText}</div>
                            {suggestion.secondaryText && (
                              <div className="text-xs text-muted-foreground">{suggestion.secondaryText}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={isLoading} className="h-12 w-full">
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {searchResults.length > 0 && (
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((place) => (
                    <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-4" onClick={() => handlePlaceClick(place)}>
                        <h3 className="font-semibold text-lg mb-2">{place.name}</h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {place.formatted_address}
                          </span>
                        </div>

                        {place.rating && (
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{place.rating}</span>
                            {place.user_ratings_total && (
                              <span className="text-sm text-muted-foreground">
                                ({place.user_ratings_total} reviews)
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            {getPriceDisplay(place.price_level)}
                          </Badge>
                          
                          {place.opening_hours?.open_now !== undefined && (
                            <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                              {place.opening_hours.open_now ? "Open" : "Closed"}
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {place.types.slice(0, 3).map((type) => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="map">
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <GlobalSearchMap
                    restaurants={searchResults}
                    onRestaurantClick={handlePlaceClick}
                    center={userLocation || { lat: 40.7128, lng: -74.0060 }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>

        <TabsContent value="smart">
          <DiscoverPage />
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-6">
            <PersonalizedRecommendations />
          </div>
        </TabsContent>
      </Tabs>

      {/* Restaurant Profile Modal */}
      {selectedPlace && (
        <RestaurantProfileModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Star, Heart, Phone, Globe, Navigation, Clock, Plus, Truck, ShoppingBag, X } from 'lucide-react';
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
import { SearchResultSkeleton } from '@/components/skeletons/SearchResultSkeleton';
import { MobileRestaurantSearch } from '@/components/MobileRestaurantSearch';

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
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
    menu_url?: string;
  };
  aiAnalysis?: {
    cuisine: string;
    categories: string[];
  };
  fallbackCuisine?: string;
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [liveSearchResults, setLiveSearchResults] = useState<GooglePlaceResult[]>([]);
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'smart' | 'recommendations'>('global');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [priceFilter, setPriceFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [radius, setRadius] = useState<number>(25000);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Click outside handler to hide dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowLiveResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search for restaurants
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.length > 2) {
        performLiveSearch();
      } else {
        setLiveSearchResults([]);
        setShowLiveResults(false);
      }
    }, 150);
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
        radius: radius
      };

      if (userLocation && !locationQuery.trim()) {
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000;
      }

      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });

      if (error) {
        setLiveSearchResults([]);
        setShowLiveResults(false);
        setIsLiveSearching(false);
        return;
      }

      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        setLiveSearchResults(data.results.slice(0, 6));
        setShowLiveResults(true);
      } else {
        setLiveSearchResults([]);
        setShowLiveResults(false);
      }
    } catch (error) {
      setLiveSearchResults([]);
      setShowLiveResults(false);
    } finally {
      setIsLiveSearching(false);
    }
  };

  const handleQuickAdd = async (place: GooglePlaceResult) => {
    if (!user) {
      toast.error('Please log in to add restaurants');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });
      if (error) throw error;
      const placeDetails = data.result;

      const { error: insertError } = await supabase.from('restaurants').insert({
        name: place.name,
        address: place.formatted_address,
        city: place.formatted_address.split(',')[1]?.trim() || '',
        cuisine: 'Various',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: null,
        is_wishlist: false,
        user_id: user.id,
        website: placeDetails?.website,
        opening_hours: placeDetails?.opening_hours?.weekday_text?.join('\n'),
        price_range: place.price_level
      });
      if (insertError) throw insertError;
      toast.success('Restaurant added! Please rate your experience.');
      setShowLiveResults(false);
      setSearchQuery('');
      setSelectedPlace(placeDetails);
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };

  const generateLocationSuggestions = async (input: string) => {
    if (input.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('location-suggestions', {
        body: {
          input,
          limit: 5
        }
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

  const clearSearch = () => {
    setSearchQuery('');
    setShowLiveResults(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
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
        radius: radius
      };

      if (userLocation && !locationQuery.trim()) {
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000;
      }

      if (priceFilter) {
        searchParams.price_level = priceFilter;
      }

      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const results = data.results || [];
        const resultsWithFallback = results.map(result => ({
          ...result,
          fallbackCuisine: result.types.find(type => 
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

  const handlePlaceClick = async (place: GooglePlaceResult) => {
    setSelectedPlace({
      ...place,
      formatted_phone_number: undefined,
      website: undefined,
      opening_hours: place.opening_hours ? {
        open_now: place.opening_hours.open_now,
        weekday_text: []
      } : undefined,
      reviews: []
    });

    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const detailedPlace = data.result;
        setSelectedPlace(detailedPlace);

        supabase.functions.invoke('yelp-restaurant-data', {
          body: {
            action: 'search',
            term: detailedPlace.name,
            location: detailedPlace.formatted_address,
            limit: 1,
            sort_by: 'best_match'
          }
        }).then(({ data: yelpData, error: yelpError }) => {
          if (!yelpError && yelpData?.businesses?.length > 0) {
            const yelpBusiness = yelpData.businesses[0];
            setSelectedPlace(prev => prev ? {
              ...prev,
              yelpData: {
                id: yelpBusiness.id,
                url: yelpBusiness.url,
                categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
                price: yelpBusiness.price || undefined,
                photos: yelpBusiness.photos || [],
                transactions: yelpBusiness.transactions || [],
                menu_url: yelpBusiness.menu_url || undefined
              }
            } : null);
          }
        }).catch(error => {
          console.error('Yelp API call failed:', error);
        });
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
    <div className="w-full">
      {/* Mobile Search Section */}
      <div className="lg:hidden px-4 py-4 space-y-4">
        <div className="mb-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'global' | 'smart' | 'recommendations')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global">Restaurants</TabsTrigger>
              <TabsTrigger value="smart">Friends</TabsTrigger>
            </TabsList>
            
            <TabsContent value="global" className="space-y-4">
              <MobileRestaurantSearch onPlaceSelect={handlePlaceClick} />
              
              {/* Mobile Filters */}
              <div className="flex gap-2">
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Price</SelectItem>
                    <SelectItem value="1">$</SelectItem>
                    <SelectItem value="2">$$</SelectItem>
                    <SelectItem value="3">$$$</SelectItem>
                    <SelectItem value="4">$$$$</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="smart" className="space-y-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">Friends search functionality coming soon!</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Mobile Results */}
        {(isLoading || searchResults.length > 0) && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid gap-3">
                {[...Array(3)].map((_, i) => (
                  <SearchResultSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3">
                {searchResults.map(place => (
                  <Card key={place.place_id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePlaceClick(place)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-base leading-tight line-clamp-2">
                          {place.name}
                        </h3>
                        <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(place);
                        }} className="shrink-0 ml-2 p-1">
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                    
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {place.formatted_address}
                        </span>
                      </div>

                      {place.rating && (
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-sm font-medium">{place.rating}</span>
                          {place.user_ratings_total && (
                            <span className="text-xs text-muted-foreground">
                              ({place.user_ratings_total.toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex">
                          <span className="text-sm font-bold text-green-600">
                            {place.yelpData?.price || getPriceDisplay(place.price_level)}
                          </span>
                        </div>
                        
                        {place.opening_hours?.open_now !== undefined && (
                          <Badge variant={place.opening_hours.open_now ? "default" : "destructive"} className="text-xs">
                            {place.opening_hours.open_now ? "Open" : "Closed"}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Search Section */}
      <div className="hidden lg:block relative rounded-2xl bg-gradient-to-br from-background via-background to-primary/10 border border-primary/20 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-glow/5 opacity-50" />
        
        <div className="relative p-8">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
              Discover Your Next Favorite Restaurant
            </h2>
            <p className="text-muted-foreground">
              Search restaurants, explore cuisines, and find your perfect dining experience
            </p>
          </div>

          {/* Desktop Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'global' | 'smart' | 'recommendations')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">Global Search</TabsTrigger>
              <TabsTrigger value="smart">Smart Discovery</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="space-y-6">
              <div className="relative" ref={searchRef}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search restaurants, cuisines, or dishes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 pr-10 h-12"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Location"
                      value={locationQuery}
                      onChange={(e) => {
                        setLocationQuery(e.target.value);
                        generateLocationSuggestions(e.target.value);
                        setShowLocationSuggestions(true);
                      }}
                      className="pl-10 h-12"
                    />
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-background border border-border rounded-md shadow-md z-50 max-h-60 overflow-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="p-3 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
                            onClick={() => handleLocationSuggestionClick(suggestion)}
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{suggestion.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-4">
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Price Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Price</SelectItem>
                      <SelectItem value="1">$ (Under $15)</SelectItem>
                      <SelectItem value="2">$$ ($15-30)</SelectItem>
                      <SelectItem value="3">$$$ ($30-60)</SelectItem>
                      <SelectItem value="4">$$$$ ($60+)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={radius.toString()} onValueChange={(value) => setRadius(Number(value))}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Distance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5000">Within 5km</SelectItem>
                      <SelectItem value="10000">Within 10km</SelectItem>
                      <SelectItem value="25000">Within 25km</SelectItem>
                      <SelectItem value="50000">Within 50km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleSearch} className="px-8 h-12" disabled={isLoading}>
                    {isLoading ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {/* Live Search Dropdown */}
                {showLiveResults && liveSearchResults.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
                    <div className="p-2">
                      <div className="text-xs text-muted-foreground mb-2 px-2">Quick Results</div>
                      {liveSearchResults.map((place) => (
                        <div
                          key={place.place_id}
                          className="flex items-center justify-between p-3 hover:bg-accent rounded-md cursor-pointer group"
                          onClick={() => handlePlaceClick(place)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{place.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{place.formatted_address}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {place.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs">{place.rating}</span>
                                </div>
                              )}
                              <span className="text-xs font-medium text-green-600">
                                {getPriceDisplay(place.price_level)}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(place);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="smart" className="space-y-6">
              <DiscoverPage />
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-6">
              <PersonalizedRecommendations />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Results Section */}
      {(isLoading || searchResults.length > 0) && (
        <div className="hidden lg:block mt-8">
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="map">Map View</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="space-y-4">
              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <SearchResultSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((place) => (
                    <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow group">
                      <div className="relative h-48 overflow-hidden rounded-t-lg">
                        {place.photos && place.photos.length > 0 ? (
                          <img
                            src={getPhotoUrl(place.photos[0].photo_reference)}
                            alt={place.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onClick={() => handlePlaceClick(place)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <span className="text-muted-foreground">No image available</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(place);
                            }}
                            className="bg-background/90 hover:bg-background"
                          >
                            <Heart className="h-4 w-4" />
                          </Button>
                        </div>
                        {place.opening_hours?.open_now !== undefined && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                              {place.opening_hours.open_now ? "Open" : "Closed"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-4" onClick={() => handlePlaceClick(place)}>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{place.name}</h3>
                        
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
                                ({place.user_ratings_total.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-600">
                            {place.yelpData?.price || getPriceDisplay(place.price_level)}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {place.yelpData?.transactions?.includes('delivery') && (
                              <Badge variant="secondary">
                                <Truck className="h-3 w-3 mr-1" />
                                Delivery
                              </Badge>
                            )}
                            {place.yelpData?.transactions?.includes('pickup') && (
                              <Badge variant="secondary">
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                Pickup
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="map">
              <div className="h-96 rounded-lg overflow-hidden">
                <GlobalSearchMap restaurants={searchResults} onRestaurantClick={handlePlaceClick} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

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
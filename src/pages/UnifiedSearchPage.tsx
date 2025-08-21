import { useState, useEffect, useRef, useCallback } from 'react';
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
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  console.log('UnifiedSearchPage component starting...');
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'smart' | 'recommendations'>('global');
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [recentClickedRestaurants, setRecentClickedRestaurants] = useState<GooglePlaceResult[]>([]);
  const [recommendedPlaces, setRecommendedPlaces] = useState<GooglePlaceResult[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [isLoadingMoreRecommendations, setIsLoadingMoreRecommendations] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [userRestaurants, setUserRestaurants] = useState<any[]>([]);
const searchRef = useRef<HTMLDivElement>(null);
const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
const [searchError, setSearchError] = useState<string | null>(null);

  // Load initial data on component mount
  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(position => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }, error => {
        console.log('Location access denied:', error);
      });
    }
  }, []);

  // Load recent restaurants and user's restaurants for recommendations
  const loadInitialData = async () => {
    if (!user) return;

    // Load recent clicked restaurants from localStorage
    const savedRestaurants = localStorage.getItem('recentClickedRestaurants');
    if (savedRestaurants) {
      setRecentClickedRestaurants(JSON.parse(savedRestaurants).slice(0, 12));
    }

    // Load user's restaurants to generate location-based recommendations
    try {
      const {
        data: restaurants,
        error
      } = await supabase.from('restaurants').select('city, country, latitude, longitude').eq('user_id', user.id).not('rating', 'is', null); // Only rated restaurants

      if (error) throw error;
      setUserRestaurants(restaurants || []);

      // Generate recommendations based on user's rated restaurant locations
      if (restaurants && restaurants.length > 0) {
        generateLocationBasedRecommendations(restaurants);
      }
    } catch (error) {
      console.error('Error loading user restaurants:', error);
    }
  };

  // Generate recommendations based on locations where user has rated restaurants
  const generateLocationBasedRecommendations = useCallback(async (userRestaurants: any[], isLoadMore = false) => {
    if (!userRestaurants.length) return;
    if (isLoadMore) {
      setIsLoadingMoreRecommendations(true);
    } else {
      setIsLoadingRecommendations(true);
    }
    try {
      // Get unique cities from user's restaurants
      const cities = [...new Set(userRestaurants.map(r => r.city).filter(Boolean))];

      // Pick a random city from user's history
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      if (randomCity) {
        const params: any = {
          query: `restaurants in ${randomCity}`,
          type: 'search',
          radius: 25000
        };
        if (isLoadMore && nextPageToken) {
          params.pagetoken = nextPageToken;
        }
        const {
          data,
          error
        } = await supabase.functions.invoke('google-places-search', {
          body: params
        });
        if (!error && data?.status === 'OK' && data.results?.length > 0) {
          const recommendations = data.results.map((result: any) => ({
            ...result,
            fallbackCuisine: result.types.find((type: string) => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant'
          }));
          if (isLoadMore) {
            // Filter out duplicates based on place_id
            const existingPlaceIds = new Set(recommendedPlaces.map(place => place.place_id));
            const newRecommendations = recommendations.filter(place => !existingPlaceIds.has(place.place_id));
            setRecommendedPlaces(prev => [...prev, ...newRecommendations]);
          } else {
            setRecommendedPlaces(recommendations);
          }

          // Update pagination state
          setNextPageToken(data.next_page_token || null);
          setHasMoreRecommendations(!!data.next_page_token && data.results.length > 0);
        } else {
          setHasMoreRecommendations(false);
        }
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      setHasMoreRecommendations(false);
    } finally {
      if (isLoadMore) {
        setIsLoadingMoreRecommendations(false);
      } else {
        setIsLoadingRecommendations(false);
      }
    }
  }, [nextPageToken, recommendedPlaces]);
  const loadMoreRecommendations = useCallback(() => {
    if (!isLoadingMoreRecommendations && hasMoreRecommendations && nextPageToken && userRestaurants.length > 0) {
      generateLocationBasedRecommendations(userRestaurants, true);
    }
  }, [isLoadingMoreRecommendations, hasMoreRecommendations, nextPageToken, userRestaurants, generateLocationBasedRecommendations]);

  // Save clicked restaurant to recent restaurants
  const saveToRecentRestaurants = (place: GooglePlaceResult) => {
    const savedRestaurants = localStorage.getItem('recentClickedRestaurants');
    let restaurants = savedRestaurants ? JSON.parse(savedRestaurants) : [];

    // Remove if already exists and add to beginning
    restaurants = restaurants.filter((r: GooglePlaceResult) => r.place_id !== place.place_id);
    restaurants.unshift(place);

    // Keep only 10 most recent
    restaurants = restaurants.slice(0, 10);
    localStorage.setItem('recentClickedRestaurants', JSON.stringify(restaurants));
    setRecentClickedRestaurants(restaurants.slice(0, 12));
  };

  // Live search for restaurants - runs as user types
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      if (searchQuery.length > 2) {
        performLiveSearch();
      } else {
        setSearchResults([]);
      }
    }, 150); // Faster debounce for more responsive search

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, locationQuery]);
const performLiveSearch = async () => {
  if (!searchQuery.trim() || searchQuery.length < 3) {
    setSearchResults([]);
    setSearchError(null);
    return;
  }
  setIsLoading(true);
  setSearchError(null);
  try {
    // Simplified search - just use query and location text for speed
    const searchParams: any = {
      query: locationQuery.trim() ? `${searchQuery} in ${locationQuery}` : searchQuery,
      type: 'search',
      radius: 25000 // Standard radius
    };

    // Only add coordinates if user location is available (no geocoding delay)
    if (userLocation && !locationQuery.trim()) {
      searchParams.location = `${userLocation.lat},${userLocation.lng}`;
      searchParams.radius = 50000;
    }

    const { data, error } = await supabase.functions.invoke('google-places-search', {
      body: searchParams
    });

    if (!error && data && data.status === 'OK' && data.results && data.results.length > 0) {
      const resultsWithFallback = data.results.map((result: any) => ({
        ...result,
        fallbackCuisine: result.types.find((type: string) => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant'
      }));
      setSearchResults(resultsWithFallback);
      return;
    }

    // Fallback: AI discovery search if Google Places fails or returns empty
    const fallbackQuery = searchQuery;
    const fallbackLocation = locationQuery;
    const { data: aiData, error: aiError } = await supabase.functions.invoke('restaurant-discovery', {
      body: {
        query: fallbackQuery,
        location: fallbackLocation,
        searchType: 'description',
        filters: {}
      }
    });

    if (!aiError && aiData?.restaurants?.length) {
      const mapped = aiData.restaurants.map((r: any) => ({
        place_id: r.id || `${r.name}-${r.address}`,
        name: r.name,
        formatted_address: r.address,
        rating: r.rating || undefined,
        user_ratings_total: r.reviewCount || undefined,
        price_level: r.priceRange || undefined,
        photos: [],
        geometry: { location: { lat: r.location?.lat || 0, lng: r.location?.lng || 0 } },
        types: [r.cuisine ? r.cuisine.toLowerCase().replace(/\s+/g, '_') : 'restaurant'],
        opening_hours: typeof r.isOpen === 'boolean' ? { open_now: r.isOpen } : undefined,
        fallbackCuisine: r.cuisine || 'Restaurant',
        yelpData: r.yelpData
      }));
      setSearchResults(mapped);
      setSearchError('Google search is temporarily unavailable. Showing AI results instead.');
    } else {
      setSearchResults([]);
      setSearchError('Search service is currently unavailable. Please try again later.');
    }
  } catch (error) {
    setSearchResults([]);
    setSearchError('Unexpected error during search. Please retry.');
  } finally {
    setIsLoading(false);
  }
};
  const handleQuickAdd = async (place: GooglePlaceResult) => {
    if (!user) {
      toast.error('Please log in to add restaurants');
      return;
    }
    try {
      // Get place details first
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });
      if (error) throw error;
      const placeDetails = data.result;

      // Create a restaurant entry in wishlist mode first
      const {
        error: insertError
      } = await supabase.from('restaurants').insert({
        name: place.name,
        address: place.formatted_address,
        city: place.formatted_address.split(',')[1]?.trim() || '',
        cuisine: 'Various',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        google_place_id: place.place_id,
        rating: null,
        is_wishlist: true,
        user_id: user.id,
        country: place.formatted_address.split(',').pop()?.trim() || '',
        website: placeDetails.website,
        opening_hours: placeDetails.opening_hours?.weekday_text?.join('\n'),
        price_range: placeDetails.price_level,
        phone_number: placeDetails.formatted_phone_number
      });
      if (insertError) throw insertError;
      toast.success('Restaurant added! Please rate your experience.');
      setSearchQuery('');

      // Navigate to ratings page or open rating modal
      setSelectedPlace(placeDetails);
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };

  // Generate location suggestions
  const generateLocationSuggestions = async (input: string) => {
    if (input.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('location-suggestions', {
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
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
  const handlePlaceClick = async (place: GooglePlaceResult) => {
    // Save clicked restaurant to recent restaurants
    saveToRecentRestaurants(place);

    // On mobile, navigate to full page. On desktop, show modal
    if (window.innerWidth < 768) {
      // md breakpoint
      // Navigate to mobile restaurant details page
      const placeData = encodeURIComponent(JSON.stringify(place));
      navigate(`/mobile/search/restaurant?data=${placeData}`);
      return;
    }

    // Desktop behavior - show modal
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

    // Load detailed data in background
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: place.place_id,
          type: 'details'
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const detailedPlace = data.result;
        setSelectedPlace(detailedPlace);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    }
  };
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };
  const getPhotoUrl = (photoReference: string) => {
    return `https://ocpmhsquwsdaauflbygf.supabase.co/functions/v1/google-photo-proxy?photoreference=${encodeURIComponent(photoReference)}&maxwidth=400`;
  };
  return <div className="w-full">
      {/* Modern Search Section */}
      <div className="w-full border-b border-border/50 bg-background/50 backdrop-blur-sm">
        <div className="w-full py-4">
          {/* Search Form */}
          <div className="space-y-4">
            <div className="w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
                {/* Main Search Input */}
                <div className="lg:col-span-2 relative" ref={searchRef}>
                  <div className="relative group w-full">
                    <div className="relative bg-background border border-border rounded-md hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 group-hover:text-primary transition-colors duration-300" />
                      <Input 
                        placeholder="Search restaurants, cuisines, or dishes..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="pl-12 pr-10 h-10 bg-transparent border-none text-sm placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none rounded-md" 
                      />
                      {searchQuery && 
                        <button 
                          onClick={clearSearch} 
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      }
                    </div>
                  </div>
                </div>
              
                {/* Location Input */}
                <div className="relative">
                  <div className="relative group w-full">
                    <div className="relative bg-background border border-border rounded-md hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      <Input 
                        placeholder="Location" 
                        value={locationQuery} 
                        onChange={e => {
                          setLocationQuery(e.target.value);
                          generateLocationSuggestions(e.target.value);
                          setShowLocationSuggestions(e.target.value.length > 1);
                        }} 
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setShowLocationSuggestions(false);
                          }
                        }} 
                        onFocus={() => locationQuery.length > 1 && setShowLocationSuggestions(true)} 
                        onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)} 
                        className="pl-12 pr-3 h-10 bg-transparent border-none text-sm placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none rounded-md" 
                      />
                      
                      {/* Modern Location Suggestions */}
                      {showLocationSuggestions && locationSuggestions.length > 0 && 
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/95 backdrop-blur-lg border border-border rounded-lg shadow-2xl overflow-hidden animate-fade-in">
                          <div className="max-h-48 overflow-y-auto">
                            {locationSuggestions.map((suggestion, index) => 
                              <div 
                                key={index} 
                                className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors duration-200 border-b border-border/50 last:border-b-0 group" 
                                onClick={() => handleLocationSuggestionClick(suggestion)}
                              >
                                <div className="font-medium text-sm group-hover:text-primary transition-colors">{suggestion.mainText}</div>
                                {suggestion.secondaryText && <div className="text-xs text-muted-foreground mt-1">{suggestion.secondaryText}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
            

{/* Error / Fallback notice */}
{searchError && (
  <Alert variant="destructive" className="mt-3">
    <AlertTitle>Search issue</AlertTitle>
    <AlertDescription>{searchError}</AlertDescription>
  </Alert>
)}
          </div>
        </div>
      </div>
      
      {/* Mobile Instant Suggestions Section */}
      {!searchQuery && user && (searchResults.length === 0 || !isLoading) && <div className="lg:hidden mt-6 space-y-6">

          {/* Recent Restaurants Section */}
          {recentClickedRestaurants.length > 0 && <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Recent searches</h3>
                  <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-primary-glow rounded-full"></div>
                </div>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">Quick access</Badge>
              </div>
              
              <div className="space-y-2">
                {recentClickedRestaurants.map(place => <div key={place.place_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handlePlaceClick(place)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{place.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{place.formatted_address}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {place.rating && <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-medium">{place.rating}</span>
                        </div>}
                      
                    </div>
                  </div>)}
              </div>
            </div>}

          {/* Recommendations Section */}
          {recommendedPlaces.length > 0 && <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Recommended for you</h3>
                  <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-primary-glow rounded-full"></div>
                </div>
              </div>
              
              {isLoadingRecommendations ? <div className="grid gap-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
                </div> : <div className="space-y-2">
                  {recommendedPlaces.map((place, index) => <div key={place.place_id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handlePlaceClick(place)}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{place.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{place.formatted_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {place.rating && <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{place.rating}</span>
                          </div>}
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                          View
                        </Button>
                      </div>
                    </div>)}
                  
                  {hasMoreRecommendations && <InfiniteScrollLoader onLoadMore={loadMoreRecommendations} isLoading={isLoadingMoreRecommendations} hasMore={hasMoreRecommendations} />}
                </div>}
            </div>}

          {/* Fallback for no data */}
          {recentClickedRestaurants.length === 0 && recommendedPlaces.length === 0 && !isLoadingRecommendations && <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">Start exploring</h3>
              <p className="text-muted-foreground text-sm">
                Search for restaurants to start building your personal recommendations
              </p>
            </div>}
        </div>}
      
      {/* Results Section */}
      {(isLoading || searchResults.length > 0) && <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {isLoading ? <div className="space-y-3">
                {[...Array(6)].map((_, i) => <SearchResultSkeleton key={i} />)}
              </div> : <div className="space-y-3">
                {searchResults.map(place => <Card key={place.place_id} className="overflow-hidden bg-card border-0 shadow-[0_6px_25px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300 rounded-2xl cursor-pointer group" onClick={() => handlePlaceClick(place)}>
                    <CardContent className="p-4">
                      {/* Mobile Layout */}
                      <div className="lg:hidden">
                        <div className="space-y-2">
                          {/* Top Row: Name and Rating */}
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-bold text-base text-foreground truncate flex-1">{place.name}</h3>
                            {place.rating && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="text-amber-400 text-sm">★</div>
                                <span className="text-sm font-bold text-foreground">
                                  {place.rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Second Row: Cuisine and Price */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {place.aiAnalysis?.cuisine || place.fallbackCuisine || 'Restaurant'}
                            </span>
                            {place.price_level && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                  {place.yelpData?.price || getPriceDisplay(place.price_level)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Third Row: City and Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted-foreground">
                              {(() => {
                                const parts = place.formatted_address?.split(', ') || [];
                                if (parts.length >= 2) {
                                  if (parts[parts.length - 1] === 'United States') {
                                    const city = parts[parts.length - 3] || '';
                                    return city;
                                  }
                                  const city = parts[parts.length - 2] || '';
                                  return city.replace(/\s+[A-Z0-9]{2,10}$/, '');
                                }
                                return parts[0] || '';
                              })()}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {place.opening_hours?.open_now !== undefined && (
                                <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  place.opening_hours.open_now 
                                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                                }`}>
                                  {place.opening_hours.open_now ? 'Open' : 'Closed'}
                                </div>
                              )}
                              <Button 
                                size="sm" 
                                className="h-7 px-3 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleQuickAdd(place);
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:block">
                        <div className="space-y-3">
                          {/* Top Row: Name and Rating */}
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-bold text-lg text-foreground truncate flex-1">{place.name}</h3>
                            {place.rating && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="text-amber-400 text-base">★</div>
                                <span className="text-base font-bold text-foreground">
                                  {place.rating.toFixed(1)}
                                </span>
                                {place.user_ratings_total && (
                                  <span className="text-sm text-muted-foreground">
                                    ({place.user_ratings_total.toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Second Row: Cuisine and Price */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">
                              {place.aiAnalysis?.cuisine || place.fallbackCuisine || 'Restaurant'}
                            </span>
                            {place.price_level && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                                  {place.yelpData?.price || getPriceDisplay(place.price_level)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Third Row: City */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {place.formatted_address?.split(',')[0] || ''}
                            </span>
                          </div>
                          
                          {/* Status Tags and Actions Row */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {place.opening_hours?.open_now !== undefined && (
                                <div className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                  place.opening_hours.open_now 
                                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
                                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
                                }`}>
                                  {place.opening_hours.open_now ? 'Open' : 'Closed'}
                                </div>
                              )}
                              {place.yelpData && (
                                <div className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/30 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
                                  Yelp ✓
                                </div>
                              )}
                              {place.yelpData?.transactions?.includes('delivery') && (
                                <div className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                                  <Truck className="h-2.5 w-2.5" />
                                  Delivery
                                </div>
                              )}
                              {place.yelpData?.transactions?.includes('pickup') && (
                                <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-950/30 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                                  <ShoppingBag className="h-2.5 w-2.5" />
                                  Pickup
                                </div>
                              )}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-4 rounded-full border-border hover:bg-muted/50 font-medium"
                                onClick={() => handlePlaceClick(place)}
                              >
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                className="h-8 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleQuickAdd(place);
                                }}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                         </div>
                       </div>
                     </CardContent>
                   </Card>)}
               </div>}
           </TabsContent>

          <TabsContent value="map">
            <div className="h-[600px] rounded-lg overflow-hidden">
              <GlobalSearchMap restaurants={searchResults} onRestaurantClick={handlePlaceClick} center={userLocation || {
            lat: 40.7128,
            lng: -74.0060
          }} />
            </div>
          </TabsContent>
        </Tabs>}

      {/* Restaurant Profile Modal - Desktop Only */}
      {selectedPlace && window.innerWidth >= 768 && <RestaurantProfileModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </div>;
}
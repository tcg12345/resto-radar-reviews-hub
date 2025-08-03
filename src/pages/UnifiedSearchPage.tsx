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
      setRecentClickedRestaurants(JSON.parse(savedRestaurants).slice(0, 5));
    }
    
    // Load user's restaurants to generate location-based recommendations
    try {
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('city, country, latitude, longitude')
        .eq('user_id', user.id)
        .not('rating', 'is', null); // Only rated restaurants
      
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

        const { data, error } = await supabase.functions.invoke('google-places-search', {
          body: params
        });
        
        if (!error && data?.status === 'OK' && data.results?.length > 0) {
          const recommendations = data.results.map((result: any) => ({
            ...result,
            fallbackCuisine: result.types.find((type: string) => 
              !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
            )?.replace(/_/g, ' ') || 'Restaurant'
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
  }, [nextPageToken, setRecommendedPlaces, setNextPageToken, setHasMoreRecommendations, setIsLoadingRecommendations, setIsLoadingMoreRecommendations]);

  const loadMoreRecommendations = useCallback(() => {
    if (!isLoadingMoreRecommendations && hasMoreRecommendations && nextPageToken && userRestaurants.length > 0) {
      generateLocationBasedRecommendations(userRestaurants, true);
    }
  }, [isLoadingMoreRecommendations, hasMoreRecommendations, nextPageToken, userRestaurants]);

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
    setRecentClickedRestaurants(restaurants.slice(0, 5));
  };

  // Click outside handler to hide dropdown - not needed anymore
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        // No longer needed for live results
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search for restaurants
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
      return;
    }
    
    setIsLoading(true);
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
      
      if (error) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }
      
      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        // Add immediate fallback cuisine to all results for instant display
        const resultsWithFallback = data.results.map(result => ({
          ...result,
          fallbackCuisine: result.types.find(type => 
            !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
          )?.replace(/_/g, ' ') || 'Restaurant'
        }));
        
        setSearchResults(resultsWithFallback);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      setSearchResults([]);
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
        // Will be determined later
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        google_place_id: place.place_id, // Include place_id for community linking
        rating: null,
        // No rating yet - they will add it
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
      // For now, we'll show the place details to allow rating
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
  // Remove old handleSearch function since we now use live search
  const handlePlaceClick = async (place: GooglePlaceResult) => {
    // Save clicked restaurant to recent restaurants
    saveToRecentRestaurants(place);
    
    // On mobile, navigate to full page. On desktop, show modal
    if (window.innerWidth < 768) { // md breakpoint
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

        // Update modal with detailed Google data only for instant loading
        setSelectedPlace(detailedPlace);

        // Fetch Yelp data in background for the modal
        console.log('Starting Yelp API call for restaurant:', detailedPlace.name);
        supabase.functions.invoke('yelp-restaurant-data', {
          body: {
            action: 'search',
            term: detailedPlace.name,
            location: detailedPlace.formatted_address,
            limit: 1,
            sort_by: 'best_match'
          }
        }).then(({
          data: yelpData,
          error: yelpError
        }) => {
          console.log('Yelp API response:', yelpData, 'Error:', yelpError);
          if (!yelpError && yelpData?.businesses?.length > 0) {
            const yelpBusiness = yelpData.businesses[0];
            console.log('Found Yelp business:', yelpBusiness, 'URL:', yelpBusiness.url);

            // Update the modal with Yelp data
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
            console.log('Yelp data successfully added to modal!');
          } else {
            console.log('No Yelp data found:', yelpError || 'No businesses returned');
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
  return <div className="w-full">
      {/* Modern Search Section - Remove overflow hidden */}
      <div className="relative rounded-2xl bg-gradient-to-br from-background via-background to-primary/10 border border-primary/20 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-glow/5 opacity-50" />
        
        <div className="relative p-3 sm:p-4 lg:p-8">
          {/* Header Section - More compact on mobile */}
          

          {/* Combined Search Header - More compact on mobile */}
          <div className="mb-4 sm:mb-8">
            <div className="flex justify-center">
              
            </div>
          </div>

          {/* Search Form - More compact spacing on mobile */}
          <div className="space-y-3 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-6 items-start">
              {/* Main Search Input */}
              <div className="col-span-1 lg:col-span-2 space-y-2 relative" ref={searchRef}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-background/80 backdrop-blur-sm rounded-lg border border-border group-hover:border-primary/50 transition-all duration-300">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-hover:text-primary transition-colors duration-300" />
                    <Input placeholder="🔍 What are you craving? Search by name, cuisine, atmosphere, or special dishes..." value={searchQuery} onChange={e => {
                    setSearchQuery(e.target.value);
                  }} className="pl-12 pr-10 h-12 sm:h-14 bg-transparent border-none text-base sm:text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" />
                    {searchQuery && <button onClick={clearSearch} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50">
                        <X className="h-4 w-4" />
                      </button>}
                  </div>
                </div>
              </div>
              
              {/* Location Input */}
              <div className="col-span-1 space-y-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-primary/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-background/80 backdrop-blur-sm rounded-lg border border-border group-hover:border-primary/50 transition-all duration-300">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    <Input placeholder="📍 Location (optional)" value={locationQuery} onChange={e => {
                    setLocationQuery(e.target.value);
                    generateLocationSuggestions(e.target.value);
                    setShowLocationSuggestions(e.target.value.length > 1);
                  }} onKeyDown={e => {
                    if (e.key === 'Escape') {
                      setShowLocationSuggestions(false);
                    }
                  }} onFocus={() => locationQuery.length > 1 && setShowLocationSuggestions(true)} onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)} className="pl-12 pr-4 h-12 sm:h-14 bg-transparent border-none text-base sm:text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" />
                    
                    {/* Modern Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="max-h-48 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => <div key={index} className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors duration-200 border-b border-border/50 last:border-b-0 group" onClick={() => handleLocationSuggestionClick(suggestion)}>
                              <div className="font-medium text-sm group-hover:text-primary transition-colors">{suggestion.mainText}</div>
                              {suggestion.secondaryText && <div className="text-xs text-muted-foreground mt-1">{suggestion.secondaryText}</div>}
                            </div>)}
                        </div>
                      </div>}
                  </div>
                </div>
              </div>
              
              {/* Remove Search Button since we now use live search */}
            </div>
            
            {/* Location-based search info */}
            {(locationQuery || userLocation) && <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {locationQuery ? `Searching near "${locationQuery}"` : 'Searching near your location'}
                  {!locationQuery && userLocation && ' - specify a location above for more targeted results'}
                </p>
              </div>}
          </div>
        </div>
      </div>
      
      {/* Mobile Instant Suggestions Section - Show when no search query and user is logged in */}
      {!searchQuery && user && (searchResults.length === 0 || !isLoading) && (
        <div className="lg:hidden mt-6 space-y-6">
          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button variant="default" size="sm" className="flex-shrink-0 rounded-full bg-primary text-primary-foreground">
              Reserve now
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full">
              ❤️ Recs
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full">
              📈 Trending
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 rounded-full">
              🔥 Popular
            </Button>
          </div>

          {/* Recent Restaurants Section */}
          {(() => {
            console.log('Checking recent clicked restaurants length:', recentClickedRestaurants?.length);
            const hasRecentItems = recentClickedRestaurants && recentClickedRestaurants.length > 0;
            if (!hasRecentItems) return null;
            
            return (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Recents</h3>
                <div className="space-y-2">
                  {recentClickedRestaurants.map((restaurantItem, idx) => (
                    <div 
                      key={restaurantItem.place_id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handlePlaceClick(restaurantItem)}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{restaurantItem.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {(() => {
                            const addressParts = restaurantItem.formatted_address?.split(', ') || [];
                            if (addressParts.length >= 2) {
                              if (addressParts[addressParts.length - 1] === 'United States') {
                                const cityPart = addressParts[addressParts.length - 3] || '';
                                const stateWithZip = addressParts[addressParts.length - 2] || '';
                                const statePart = stateWithZip.replace(/\s+\d{5}(-\d{4})?$/, '');
                                return addressParts.length >= 3 ? `${cityPart}, ${statePart}` : statePart;
                              }
                              const cityPart = addressParts[addressParts.length - 2] || '';
                              const countryPart = addressParts[addressParts.length - 1] || '';
                              const cleanCity = cityPart.replace(/\s+[A-Z0-9]{2,10}$/, '');
                              return `${cleanCity}, ${countryPart}`;
                            }
                            return addressParts[0] || '';
                          })()}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          const filteredItems = recentClickedRestaurants.filter(r => r.place_id !== restaurantItem.place_id);
                          setRecentClickedRestaurants(filteredItems);
                          localStorage.setItem('recentClickedRestaurants', JSON.stringify(filteredItems));
                        }}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Location-based Recommendations */}
          {userRestaurants.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                Places you may have been in {userRestaurants[0]?.city || 'your area'}
              </h3>
              
              {isLoadingRecommendations ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="w-8 h-8 rounded-full bg-muted animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {recommendedPlaces.map((place, index) => (
                    <div 
                      key={place.place_id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handlePlaceClick(place)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{place.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {(() => {
                              const parts = place.formatted_address?.split(', ') || [];
                              if (parts.length >= 2) {
                                if (parts[parts.length - 1] === 'United States') {
                                  const city = parts[parts.length - 3] || '';
                                  const stateWithZip = parts[parts.length - 2] || '';
                                  const state = stateWithZip.replace(/\s+\d{5}(-\d{4})?$/, '');
                                  return parts.length >= 3 ? `${city}, ${state}` : state;
                                }
                                const city = parts[parts.length - 2] || '';
                                const country = parts[parts.length - 1] || '';
                                const cleanCity = city.replace(/\s+[A-Z0-9]{2,10}$/, '');
                                return `${cleanCity}, ${country}`;
                              }
                              return parts[0] || '';
                            })()}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdd(place);
                        }}
                        className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Infinite scroll loader for recommendations */}
                  <InfiniteScrollLoader
                    hasMore={hasMoreRecommendations}
                    isLoading={isLoadingMoreRecommendations}
                    onLoadMore={loadMoreRecommendations}
                  />
                </div>
              )}
            </div>
          )}

          {/* Empty state when no recent restaurants or recommendations */}
          {(() => {
            const hasRecentItems = recentClickedRestaurants && recentClickedRestaurants.length > 0;
            const hasUserRestaurants = userRestaurants && userRestaurants.length > 0;
            return !hasRecentItems && !hasUserRestaurants;
          })() && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start exploring</h3>
              <p className="text-muted-foreground text-sm">
                Search for restaurants to start building your personal recommendations
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Results Section */}
      {(isLoading || searchResults.length > 0) && <Tabs defaultValue="list" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {isLoading ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <SearchResultSkeleton key={i} />)}
              </div> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {searchResults.map(place => <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handlePlaceClick(place)}>
                     <CardContent className="p-2 lg:p-4">
                       {/* Mobile Layout - Compact like suggestions */}
                       <div className="lg:hidden">
                         <div className="flex justify-between items-center">
                            <div className="flex-1 min-w-0">
                              <div className="mb-1">
                                <h3 className="font-semibold text-sm truncate">{place.name}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                {place.rating && <div className="flex items-center gap-1">
                                    <span className="text-yellow-500 text-sm">★</span>
                                    <span className="text-xs font-medium">{place.rating}</span>
                                  </div>}
                                {place.price_level && <span className="text-xs text-green-600 font-medium">
                                    {getPriceDisplay(place.price_level)}
                                  </span>}
                                <span className="text-xs text-muted-foreground truncate">
                                  {(() => {
                          const parts = place.formatted_address?.split(', ') || [];
                          if (parts.length >= 2) {
                            // For US addresses, show "City, State" without zip code
                            if (parts[parts.length - 1] === 'United States') {
                              const city = parts[parts.length - 3] || '';
                              const stateWithZip = parts[parts.length - 2] || '';
                              // Remove zip code from state (any digits and spaces at the end)
                              const state = stateWithZip.replace(/\s+\d{5}(-\d{4})?$/, '');
                              return parts.length >= 3 ? `${city}, ${state}` : state;
                            }
                            // For international, show "City, Country" without postal codes
                            const city = parts[parts.length - 2] || '';
                            const country = parts[parts.length - 1] || '';
                            // Remove postal codes from city (various international formats)
                            const cleanCity = city.replace(/\s+[A-Z0-9]{2,10}$/, '');
                            return `${cleanCity}, ${country}`;
                          }
                          return parts[0] || '';
                        })()}
                                </span>
                              </div>
                            </div>
                           <Button size="sm" variant="outline" onClick={e => {
                    e.stopPropagation();
                    handleQuickAdd(place);
                  }} className="h-7 px-2 text-xs ml-2 flex-shrink-0">
                             <Plus className="h-3 w-3 mr-1" />
                             Add
                           </Button>
                         </div>
                       </div>

                       {/* Desktop Layout - Full details */}
                        <div className="hidden lg:block">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-lg leading-tight line-clamp-2" onClick={() => handlePlaceClick(place)}>
                              {place.name}
                            </h3>
                            <Button variant="ghost" size="sm" onClick={e => {
                    e.stopPropagation();
                    handleQuickAdd(place);
                  }} className="shrink-0 ml-2">
                              <Heart className="h-4 w-4" />
                            </Button>
                          </div>
                        
                          <div className="flex items-center gap-2 mb-2" onClick={() => handlePlaceClick(place)}>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground line-clamp-1">
                              {place.formatted_address}
                            </span>
                          </div>

                          {place.rating && <div className="flex items-center gap-2 mb-2" onClick={() => handlePlaceClick(place)}>
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="font-medium">{place.rating}</span>
                              {place.user_ratings_total && <span className="text-sm text-muted-foreground">
                                  ({place.user_ratings_total.toLocaleString()})
                                </span>}
                            </div>}

                          <div className="flex items-center justify-between mb-2" onClick={() => handlePlaceClick(place)}>
                            <div className="flex">
                              <span className="text-lg font-bold text-green-600">
                                {place.yelpData?.price || getPriceDisplay(place.price_level)}
                              </span>
                            </div>
                            
                            {place.opening_hours?.open_now !== undefined && <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                                {place.opening_hours.open_now ? "Open" : "Closed"}
                              </Badge>}
                          </div>

                          {/* Yelp Badge and Services */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {place.yelpData && <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border-red-200">
                                Yelp ✓
                              </Badge>}
                            {place.yelpData?.transactions?.includes('delivery') && <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Delivery
                              </Badge>}
                            {place.yelpData?.transactions?.includes('pickup') && <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <ShoppingBag className="h-3 w-3" />
                                Pickup
                              </Badge>}
                          </div>

                          <div className="flex flex-wrap gap-1 mb-3" onClick={() => handlePlaceClick(place)}>
                            {(() => {
                    const cuisine = place.aiAnalysis?.cuisine || place.fallbackCuisine || place.types.find(type => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant';
                    return <Badge variant="outline" className="text-xs">{cuisine}</Badge>;
                  })()}
                          </div>

                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePlaceClick(place)} className="flex-1">
                              View Details
                            </Button>
                            
                            {place.yelpData && <Button variant="outline" size="sm" onClick={e => {
                    e.stopPropagation();
                    window.open(place.yelpData.url, '_blank');
                  }}>
                                <Star className="h-4 w-4" />
                              </Button>}
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
    </div>
}
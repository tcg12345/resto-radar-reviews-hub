import { useState, useEffect } from 'react';
import { Search, MapPin, Star, Heart, Phone, Globe, Navigation, Clock, Plus, Truck, ShoppingBag } from 'lucide-react';
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
  const {
    user
  } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('description');
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

  // Live search for restaurants
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        performLiveSearch();
      } else {
        setLiveSearchResults([]);
        setShowLiveResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, locationQuery]);
  const performLiveSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) return;
    setIsLiveSearching(true);
    try {
      // Use location-specific search parameters
      const searchParams: any = {
        query: searchQuery,
        type: 'search'
      };

      // If location is provided, geocode it first for better accuracy
      if (locationQuery && locationQuery.trim()) {
        console.log('Searching with location:', locationQuery);
        try {
          // First geocode the location to get coordinates
          const {
            data: geocodeData,
            error: geocodeError
          } = await supabase.functions.invoke('geocode', {
            body: {
              address: locationQuery
            }
          });
          console.log('Geocode response:', geocodeData);
          if (geocodeData && geocodeData.results && geocodeData.results.length > 0) {
            const location = geocodeData.results[0].geometry.location;
            const formattedAddress = geocodeData.results[0].formatted_address;
            console.log('Using geocoded coordinates:', location, 'for address:', formattedAddress);
            searchParams.location = `${location.lat},${location.lng}`;
            searchParams.radius = 10000; // 10km radius for specific location
            // Use nearby search instead of text search for better location accuracy
            searchParams.type = 'nearby';
            searchParams.query = searchQuery; // Keep original query for nearby search
          } else {
            console.log('Geocoding failed, using text-based location search');
            // Fallback: use location in the query text
            searchParams.query = `${searchQuery} in ${locationQuery}`;
            searchParams.radius = 25000;
          }
        } catch (geocodeError) {
          console.log('Geocoding error:', geocodeError);
          // Fallback: include location in query text
          searchParams.query = `${searchQuery} in ${locationQuery}`;
          searchParams.radius = 25000;
        }
      } else if (userLocation) {
        console.log('Using user location:', userLocation);
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000; // 50km radius when using user location
      }
      console.log('Final search params:', searchParams);
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });
      console.log('Search response:', data);
      if (error) {
        console.error('Live search error:', error);
        setLiveSearchResults([]);
        setShowLiveResults(false);
        setIsLiveSearching(false);
        return;
      }
      if (data && data.status === 'OK' && data.results && data.results.length > 0) {
        console.log('Found restaurants:', data.results.map(r => ({
          name: r.name,
          address: r.formatted_address
        })));
        setLiveSearchResults(data.results.slice(0, 6)); // Show up to 6 results
        setShowLiveResults(true);
      } else {
        console.log('No results found, status:', data?.status);
        setLiveSearchResults([]);
        setShowLiveResults(false);
      }
    } catch (error) {
      console.error('Live search error:', error);
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
        rating: null,
        // No rating yet - they will add it
        is_wishlist: false,
        // Not wishlist, they're rating it
        user_id: user.id,
        website: placeDetails?.website,
        opening_hours: placeDetails?.opening_hours?.weekday_text?.join('\n'),
        price_range: place.price_level
      });
      if (insertError) throw insertError;
      toast.success('Restaurant added! Please rate your experience.');
      setShowLiveResults(false);
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
  const handleSearch = async () => {
    // Hide live results when official search is triggered
    setShowLiveResults(false);
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
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: specificQuery,
          type: 'search',
          location: searchLocation,
          searchType: searchType,
          radius: locationQuery.trim() ? 10000 : 50000 // Smaller radius when location specified
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const results = data.results || [];
        
        // Add immediate fallback cuisine to all results for faster display
        const resultsWithFallback = results.map(result => ({
          ...result,
          fallbackCuisine: result.types.find(type => 
            !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type)
          )?.replace(/_/g, ' ') || 'Restaurant'
        }));
        
        // Load ALL data before showing results to prevent staggered loading
        try {
          const enhancedResults = await enhanceWithYelp(resultsWithFallback);
          setSearchResults(enhancedResults);
        } catch (error) {
          console.warn('Failed to enhance with Yelp data, showing basic results:', error);
          setSearchResults(resultsWithFallback);
        }
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

  // Function to enhance search results with Yelp data and AI analysis
  const enhanceWithYelp = async (restaurants: GooglePlaceResult[]): Promise<GooglePlaceResult[]> => {
    // Limit concurrent requests to prevent API overload
    const batchSize = 3;
    const enhancedRestaurants = [...restaurants];
    
    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);
      const batchPromises = batch.map(async (restaurant, batchIndex) => {
        const actualIndex = i + batchIndex;
        try {
          // Add timeout to prevent hanging requests
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 3000)
          );
          
          // Get Yelp data
          const yelpPromise = supabase.functions.invoke('yelp-restaurant-data', {
            body: {
              action: 'search',
              term: restaurant.name,
              location: restaurant.formatted_address,
              limit: 1,
              sort_by: 'best_match'
            }
          });

          // Get AI cuisine analysis
          const aiPromise = supabase.functions.invoke('ai-restaurant-analysis', {
            body: {
              name: restaurant.name,
              types: restaurant.types,
              address: restaurant.formatted_address
            }
          });

          const [yelpResult, aiResult] = await Promise.allSettled([
            Promise.race([yelpPromise, timeoutPromise]),
            Promise.race([aiPromise, timeoutPromise])
          ]);

          // Process Yelp data
          if (yelpResult.status === 'fulfilled') {
            const { data: yelpData, error: yelpError } = yelpResult.value as any;
            if (!yelpError && yelpData?.businesses?.length > 0) {
              const yelpBusiness = yelpData.businesses[0];
              
              enhancedRestaurants[actualIndex] = {
                ...enhancedRestaurants[actualIndex],
                yelpData: {
                  id: yelpBusiness.id,
                  url: yelpBusiness.url,
                  categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
                  price: yelpBusiness.price || undefined,
                  photos: yelpBusiness.photos || [],
                  transactions: yelpBusiness.transactions || [],
                  menu_url: yelpBusiness.menu_url || undefined
                }
              };

              // Use Yelp rating if available and higher
              if (yelpBusiness.rating && yelpBusiness.rating > (enhancedRestaurants[actualIndex].rating || 0)) {
                enhancedRestaurants[actualIndex].rating = yelpBusiness.rating;
              }

              // Use Yelp review count if available and higher
              if (yelpBusiness.review_count && yelpBusiness.review_count > (enhancedRestaurants[actualIndex].user_ratings_total || 0)) {
                enhancedRestaurants[actualIndex].user_ratings_total = yelpBusiness.review_count;
              }
            }
          }

          // Process AI cuisine analysis
          if (aiResult.status === 'fulfilled') {
            const { data: aiData, error: aiError } = aiResult.value as any;
            if (!aiError && aiData?.success) {
              enhancedRestaurants[actualIndex] = {
                ...enhancedRestaurants[actualIndex],
                aiAnalysis: {
                  cuisine: aiData.cuisine,
                  categories: aiData.categories || []
                }
              };
            }
          }

        } catch (error) {
          console.warn(`Failed to enhance data for ${restaurant.name}:`, error);
        }
      });
      
      // Wait for current batch to complete before starting next batch
      await Promise.allSettled(batchPromises);
    }
    
    return enhancedRestaurants;
  };
  const handlePlaceClick = async (place: GooglePlaceResult) => {
    // Show modal immediately with basic data
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
        
        // Update modal with detailed Google data first
        setSelectedPlace(detailedPlace);
        
        // Then fetch Yelp data in background (non-blocking)
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
            
            detailedPlace.yelpData = {
              id: yelpBusiness.id,
              url: yelpBusiness.url,
              categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
              price: yelpBusiness.price || undefined,
              photos: yelpBusiness.photos || [],
              transactions: yelpBusiness.transactions || [],
              menu_url: yelpBusiness.menu_url || undefined
            };
            
            // Update modal with Yelp data
            setSelectedPlace({...detailedPlace});
          }
        }).catch(error => {
          console.warn('Failed to get Yelp data:', error);
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
  return <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Search & Discover Restaurants
        </h1>
        <p className="text-muted-foreground text-lg">
          Find restaurants worldwide with multiple search methods and personalized recommendations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'global' | 'smart' | 'recommendations')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global">Restaurant Search</TabsTrigger>
          <TabsTrigger value="smart">Smart Discovery</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-6">
          {/* Modern Search Section - Remove overflow hidden */}
          <div className="relative rounded-2xl bg-gradient-to-br from-background via-background to-primary/10 border border-primary/20 shadow-2xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-glow/5 opacity-50" />
            
            
            <div className="relative p-8">
              {/* Header Section */}
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-2">
                  Discover Your Next Favorite Restaurant
                </h2>
                <p className="text-muted-foreground">Search by name, cuisine, or let us help you find something new</p>
              </div>

              {/* Search Type Selection - Modern Pills */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-2 justify-center">
                  {[{
                  value: 'description',
                  label: 'Discover',
                  icon: '🔍'
                }, {
                  value: 'name',
                  label: 'Restaurant Name',
                  icon: '🏪'
                }, {
                  value: 'cuisine',
                  label: 'Cuisine Type',
                  icon: '🍽️'
                }].map(({
                  value,
                  label,
                  icon
                }) => <button key={value} onClick={() => setSearchType(value as SearchType)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${searchType === value ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'bg-background/50 hover:bg-background/80 border border-border hover:border-primary/50'}`}>
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>)}
                </div>
              </div>

              {/* Search Form - Modern Layout with Button on Right */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  {/* Main Search Input */}
                  <div className="lg:col-span-2 space-y-2 relative">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative bg-background/80 backdrop-blur-sm rounded-xl border border-border group-hover:border-primary/50 transition-all duration-300">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-hover:text-primary transition-colors duration-300" />
                        <Input placeholder={searchType === 'name' ? '🏪 Restaurant name (e.g., "The Cottage", "Joe\'s Pizza")' : searchType === 'cuisine' ? '🍽️ Cuisine type (e.g., "Italian", "Chinese", "Mexican")' : '🔍 What are you craving? (cuisine, atmosphere, special dishes...)'} value={searchQuery} onChange={e => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.length > 2) {
                          setShowLiveResults(true);
                        } else {
                          setShowLiveResults(false);
                        }
                      }} onKeyPress={e => e.key === 'Enter' && handleSearch()} onBlur={() => {
                        // Delay hiding to allow clicks on dropdown items
                        setTimeout(() => setShowLiveResults(false), 300);
                      }} className="pl-12 pr-4 h-14 bg-transparent border-none text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" />
                        
                        {/* Live Search Results Dropdown - Positioned below search bar */}
                        {showLiveResults && (liveSearchResults.length > 0 || isLiveSearching) && <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-xl shadow-2xl animate-fade-in" style={{
                        position: 'absolute',
                        zIndex: 99999,
                        marginTop: '8px'
                      }}>
                            <div className="max-h-96 overflow-y-auto bg-card">
                              {isLiveSearching && <div className="px-4 py-4 text-center text-muted-foreground bg-card">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="text-sm">Searching restaurants...</span>
                                  </div>
                                </div>}
                              
                              {!isLiveSearching && liveSearchResults.map((place, index) => <div key={place.place_id} className="px-4 py-4 hover:bg-primary/10 cursor-pointer transition-colors duration-200 border-b border-border/30 last:border-b-0 bg-card">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0" onClick={() => {
                                handlePlaceClick(place);
                                setShowLiveResults(false);
                              }}>
                                      <div className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="font-medium text-sm hover:text-primary transition-colors line-clamp-1">
                                            {place.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                            {place.formatted_address}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            {place.rating && <div className="flex items-center gap-1">
                                                <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                                <span className="text-xs font-medium">{place.rating}</span>
                                              </div>}
                                            {place.price_level && <div className="text-xs text-muted-foreground">
                                                {getPriceDisplay(place.price_level)}
                                              </div>}
                                            {place.opening_hours?.open_now !== undefined && <div className={`text-xs px-1.5 py-0.5 rounded-full text-xs ${place.opening_hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {place.opening_hours.open_now ? 'Open' : 'Closed'}
                                              </div>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button size="sm" variant="outline" onClick={e => {
                                  e.stopPropagation();
                                  handleQuickAdd(place);
                                }} className="h-6 px-2 text-xs bg-background hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                                        <Plus className="h-2.5 w-2.5 mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                </div>)}
                              
                              {!isLiveSearching && liveSearchResults.length === 0 && searchQuery.length > 2 && <div className="px-3 py-2 text-center text-muted-foreground text-xs">
                                  No restaurants found. Try a different search term.
                                </div>}
                            </div>
                          </div>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Input */}
                  <div className="space-y-2">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="relative bg-background/80 backdrop-blur-sm rounded-xl border border-border group-hover:border-primary/50 transition-all duration-300">
                        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        <Input placeholder="📍 Location (optional)" value={locationQuery} onChange={e => {
                        setLocationQuery(e.target.value);
                        generateLocationSuggestions(e.target.value);
                        setShowLocationSuggestions(e.target.value.length > 1);
                      }} onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSearch();
                          setShowLocationSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowLocationSuggestions(false);
                        }
                      }} onFocus={() => locationQuery.length > 1 && setShowLocationSuggestions(true)} onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)} className="pl-12 pr-4 h-14 bg-transparent border-none text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" />
                        
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
                  
                  {/* Search Button - Repositioned to the Right */}
                  <div className="space-y-2">
                    <div className="h-14 flex items-end">
                      <Button onClick={handleSearch} disabled={isLoading} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:transform-none disabled:scale-100">
                        {isLoading ? <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            <span className="hidden sm:inline">Searching...</span>
                          </div> : <div className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            <span className="hidden sm:inline">Find Restaurants</span>
                            <span className="sm:hidden">Find</span>
                          </div>}
                      </Button>
                    </div>
                  </div>
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

          {/* Results Section */}
          {searchResults.length > 0 && <Tabs defaultValue="list" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map(place => <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg leading-tight line-clamp-2" onClick={() => handlePlaceClick(place)}>
                            {place.name}
                          </h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAdd(place);
                            }}
                            className="shrink-0 ml-2"
                          >
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
                          {place.yelpData && (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border-red-200">
                              Yelp ✓
                            </Badge>
                          )}
                          {place.yelpData?.transactions?.includes('delivery') && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              Delivery
                            </Badge>
                          )}
                          {place.yelpData?.transactions?.includes('pickup') && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3" />
                              Pickup
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3" onClick={() => handlePlaceClick(place)}>
                          {/* Show single cuisine type - prioritize AI analysis, then fallback cuisine, then first relevant type */}
                          {(() => {
                            const cuisine = place.aiAnalysis?.cuisine || 
                              place.fallbackCuisine || 
                              place.types.find(type => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 
                              'Restaurant';
                            return (
                              <Badge variant="outline" className="text-xs">
                                {cuisine}
                              </Badge>
                            );
                          })()}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlaceClick(place)}
                            className="flex-1"
                          >
                            View Details
                          </Button>
                          
                          {place.yelpData && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(place.yelpData.url, '_blank');
                              }}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>)}
                </div>
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
      {selectedPlace && <RestaurantProfileModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </div>;
}
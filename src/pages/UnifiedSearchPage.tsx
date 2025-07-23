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
  const {
    user
  } = useAuth();
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
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    // Clear existing timer
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
    }, 150); // Faster debounce for more responsive search
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
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
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
  const clearSearch = () => {
    setSearchQuery('');
    setShowLiveResults(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
  const handleSearch = async () => {
    // Clear any pending live search timers
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Hide live results when official search is triggered
    setShowLiveResults(false);
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      // Simplified search for speed - use text-based search
      const searchQuery_final = locationQuery.trim() ? `${searchQuery} in ${locationQuery}` : searchQuery;
      const searchParams: any = {
        query: searchQuery_final,
        type: 'search',
        radius: 25000
      };

      // Only add user location if no location query specified
      if (userLocation && !locationQuery.trim()) {
        searchParams.location = `${userLocation.lat},${userLocation.lng}`;
        searchParams.radius = 50000;
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: searchParams
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const results = data.results || [];

        // Add immediate fallback cuisine to all results for instant display
        const resultsWithFallback = results.map(result => ({
          ...result,
          fallbackCuisine: result.types.find(type => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant'
        }));

        // Show results immediately for instant search
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
  return (
    <div className="w-full">
      {/* Mobile Search Section */}
      <div className="lg:hidden px-4 py-6">
        <MobileRestaurantSearch onPlaceSelect={handlePlaceClick} />
      </div>

      {/* Desktop Search Section */}
      <div className="hidden lg:block relative rounded-2xl bg-gradient-to-br from-background via-background to-primary/10 border border-primary/20 shadow-2xl">
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

          {/* Combined Search Header - Always Active */}
          <div className="mb-8">
            <div className="flex justify-center">
              <div className="px-6 py-3 rounded-full text-base font-medium bg-primary text-primary-foreground shadow-lg flex items-center gap-3">
                <span>🔍</span>
                <span>Restaurant Search</span>
              </div>
            </div>
          </div>

          {/* Search Form - Modern Layout with Button on Right */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* Main Search Input */}
              <div className="lg:col-span-2 space-y-2 relative" ref={searchRef}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-background/80 backdrop-blur-sm rounded-xl border border-border group-hover:border-primary/50 transition-all duration-300">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-hover:text-primary transition-colors duration-300" />
                    <Input 
                      placeholder="🔍 What are you craving? Search by name, cuisine, atmosphere, or special dishes..." 
                      value={searchQuery} 
                      onChange={e => {
                        console.log('Search input changed:', e.target.value);
                        setSearchQuery(e.target.value);
                        if (e.target.value.length > 2) {
                          console.log('Setting showLiveResults to true');
                          setShowLiveResults(true);
                        } else {
                          console.log('Setting showLiveResults to false');
                          setShowLiveResults(false);
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }} 
                      className="pl-12 pr-10 h-14 bg-transparent border-none text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" 
                    />
                    {searchQuery && (
                      <button 
                        onClick={clearSearch} 
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Live Search Results Dropdown - Positioned below search bar */}
                    {showLiveResults && (liveSearchResults.length > 0 || isLiveSearching) && (
                      <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-xl shadow-2xl animate-fade-in" style={{
                        position: 'absolute',
                        zIndex: 99999,
                        marginTop: '8px'
                      }}>
                        <div className="max-h-96 overflow-y-auto bg-card">
                          {isLiveSearching && (
                            <div className="px-4 py-4 text-center text-muted-foreground bg-card">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-sm">Searching restaurants...</span>
                              </div>
                            </div>
                          )}
                          
                          {!isLiveSearching && liveSearchResults.map((place, index) => (
                            <div key={place.place_id} className="px-4 py-4 hover:bg-primary/10 cursor-pointer transition-colors duration-200 border-b border-border/30 last:border-b-0 bg-card">
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
                                        {place.rating && (
                                          <div className="flex items-center gap-1">
                                            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
                                            <span className="text-xs font-medium">{place.rating}</span>
                                          </div>
                                        )}
                                        {place.price_level && (
                                          <div className="text-xs text-muted-foreground">
                                            {getPriceDisplay(place.price_level)}
                                          </div>
                                        )}
                                        {place.opening_hours?.open_now !== undefined && (
                                          <div className={`text-xs px-1.5 py-0.5 rounded-full text-xs ${place.opening_hours.open_now ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {place.opening_hours.open_now ? 'Open' : 'Closed'}
                                          </div>
                                        )}
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
                            </div>
                          ))}
                          
                          {!isLiveSearching && liveSearchResults.length === 0 && searchQuery.length > 2 && (
                            <div className="px-3 py-2 text-center text-muted-foreground text-xs">
                              No restaurants found. Try a different search term.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Location Input */}
              <div className="space-y-2">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-glow/20 to-primary/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative bg-background/80 backdrop-blur-sm rounded-xl border border-border group-hover:border-primary/50 transition-all duration-300">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                    <Input 
                      placeholder="📍 Location (optional)" 
                      value={locationQuery} 
                      onChange={e => {
                        setLocationQuery(e.target.value);
                        generateLocationSuggestions(e.target.value);
                        setShowLocationSuggestions(e.target.value.length > 1);
                      }} 
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleSearch();
                          setShowLocationSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowLocationSuggestions(false);
                        }
                      }} 
                      onFocus={() => locationQuery.length > 1 && setShowLocationSuggestions(true)} 
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)} 
                      className="pl-12 pr-4 h-14 bg-transparent border-none text-lg placeholder:text-muted-foreground/70 focus:ring-0 focus:outline-none" 
                    />
                    
                    {/* Modern Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-card/95 backdrop-blur-lg border border-border rounded-xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="max-h-48 overflow-y-auto">
                          {locationSuggestions.map((suggestion, index) => (
                            <div key={index} className="px-4 py-3 hover:bg-primary/10 cursor-pointer transition-colors duration-200 border-b border-border/50 last:border-b-0 group" onClick={() => handleLocationSuggestionClick(suggestion)}>
                              <div className="font-medium text-sm group-hover:text-primary transition-colors">{suggestion.mainText}</div>
                              {suggestion.secondaryText && <div className="text-xs text-muted-foreground mt-1">{suggestion.secondaryText}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Search Button - Repositioned to the Right */}
              <div className="space-y-2">
                <div className="h-14 flex items-end">
                  <Button onClick={handleSearch} disabled={isLoading} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:transform-none disabled:scale-100">
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        <span className="hidden sm:inline">Searching...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        <span className="hidden sm:inline">Find Restaurants</span>
                        <span className="sm:hidden">Find</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Location-based search info */}
            {(locationQuery || userLocation) && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {locationQuery ? `Searching near "${locationQuery}"` : 'Searching near your location'}
                  {!locationQuery && userLocation && ' - specify a location above for more targeted results'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {(isLoading || searchResults.length > 0) && (
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
                 {searchResults.map(place => (
                   <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handlePlaceClick(place)}>
                     <CardContent className="p-4">
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

                       {place.rating && (
                         <div className="flex items-center gap-2 mb-2" onClick={() => handlePlaceClick(place)}>
                           <Star className="h-4 w-4 text-yellow-500 fill-current" />
                           <span className="font-medium">{place.rating}</span>
                           {place.user_ratings_total && (
                             <span className="text-sm text-muted-foreground">
                               ({place.user_ratings_total.toLocaleString()})
                             </span>
                           )}
                         </div>
                       )}

                       <div className="flex items-center justify-between mb-2" onClick={() => handlePlaceClick(place)}>
                         <div className="flex">
                           <span className="text-lg font-bold text-green-600">
                             {place.yelpData?.price || getPriceDisplay(place.price_level)}
                           </span>
                         </div>
                         
                         {place.opening_hours?.open_now !== undefined && (
                           <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                             {place.opening_hours.open_now ? "Open" : "Closed"}
                           </Badge>
                         )}
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
                         {(() => {
                           const cuisine = place.aiAnalysis?.cuisine || place.fallbackCuisine || place.types.find(type => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant';
                           return <Badge variant="outline" className="text-xs">{cuisine}</Badge>;
                         })()}
                       </div>

                       <div className="flex gap-2">
                         <Button variant="outline" size="sm" onClick={() => handlePlaceClick(place)} className="flex-1">
                           View Details
                         </Button>
                         
                         {place.yelpData && (
                           <Button variant="outline" size="sm" onClick={e => {
                             e.stopPropagation();
                             window.open(place.yelpData.url, '_blank');
                           }}>
                             <Star className="h-4 w-4" />
                           </Button>
                         )}
                       </div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             )}
           </TabsContent>

          <TabsContent value="map">
            <div className="h-[600px] rounded-lg overflow-hidden">
              <GlobalSearchMap restaurants={searchResults} onRestaurantClick={handlePlaceClick} center={userLocation || {
                lat: 40.7128,
                lng: -74.0060
              }} />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Restaurant Profile Modal */}
      {selectedPlace && <RestaurantProfileModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </div>
  );
}
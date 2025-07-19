import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useAuth } from '@/contexts/AuthContext';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  DollarSign, 
  Filter, 
  X,
  Map,
  Grid3X3,
  Phone,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Heart,
  Eye,
  Bot,
  Sparkles,
  Mic,
  MicOff,
  Wand2,
  TrendingUp,
  Award
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RestaurantMapView } from '@/components/RestaurantMapView';
import { RestaurantDetailsModal } from '@/components/RestaurantDetailsModal';
import { AISearchAssistant } from '@/components/AISearchAssistant';
import { AIChatbot } from '@/components/AIChatbot';
import { AIReviewSummary } from '@/components/AIReviewSummary';
import { toast } from 'sonner';

interface SearchRestaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount?: number;
  priceRange: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  currentDayHours?: string;
  photos: string[];
  location: {
    lat: number;
    lng: number;
  };
  cuisine?: string;
  googleMapsUrl?: string;
  michelinStars?: number;
  features?: string[];
}

interface DiscoverRestaurant {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  priceRange: number;
  rating: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  website?: string;
  phoneNumber?: string;
  openingHours?: string;
  features: string[];
  michelinStars?: number;
  location?: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  images?: string[];
  isOpen?: boolean;
}

interface SearchFilters {
  priceRanges: number[];
  minRating: number;
  openNow: boolean;
  hasPhone: boolean;
  hasWebsite: boolean;
  cuisineTypes: string[];
}

export default function RestaurantSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const { addRestaurant, restaurants: existingRestaurants, deleteRestaurant } = useRestaurants();
  
  // Search page state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [restaurants, setRestaurants] = useState<SearchRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<SearchRestaurant | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsRestaurant, setDetailsRestaurant] = useState<SearchRestaurant | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  
  const [filters, setFilters] = useState<SearchFilters>({
    priceRanges: [],
    minRating: 0,
    openNow: false,
    hasPhone: false,
    hasWebsite: false,
    cuisineTypes: []
  });

  const cuisineOptions = [
    'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'French', 
    'Thai', 'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek'
  ];

  // Generate search suggestions based on query
  const generateSearchSuggestions = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const suggestions = [
      `${query} near me`,
      `best ${query} restaurants`,
      `${query} with outdoor seating`,
      `romantic ${query} restaurants`,
      `family-friendly ${query}`,
      `${query} open late`,
      `upscale ${query} restaurants`,
      `cheap ${query} food`
    ].filter(suggestion => suggestion.toLowerCase() !== query.toLowerCase());

    setSearchSuggestions(suggestions.slice(0, 5));
  }, []);

  // Generate location suggestions
  const generateLocationSuggestions = useCallback(async (input: string) => {
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
  }, []);

  // Restore search state from navigation and set user's address as default
  useEffect(() => {
    const state = location.state as any;
    if (state?.searchQuery) {
      setSearchQuery(state.searchQuery);
    }
    if (state?.searchLocation) {
      setSearchLocation(state.searchLocation);
    } else if (profile?.address && !searchLocation) {
      // Set user's address as default if no location is set
      setSearchLocation(profile.address);
    }
  }, [location.state, profile?.address]);

  // Get current day hours
  const getCurrentDayHours = useCallback((openingHours: string[]) => {
    if (!openingHours || openingHours.length === 0) return undefined;
    
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[today];
    
    const todayHours = openingHours.find(hours => 
      hours.toLowerCase().includes(currentDay.toLowerCase())
    );
    
    if (todayHours) {
      // Extract just the time part (e.g., "11:45 AM–2:15 PM, 5:30–9:45 PM")
      const timeMatch = todayHours.match(/(\d{1,2}:\d{2}\s*[AP]M[^,]*(?:,\s*\d{1,2}:\d{2}\s*[AP]M[^,]*)*)/i);
      return timeMatch ? timeMatch[1] : todayHours;
    }
    
    return undefined;
  }, []);

  const activeFiltersCount = 
    filters.priceRanges.length + 
    (filters.minRating > 0 ? 1 : 0) + 
    (filters.openNow ? 1 : 0) + 
    (filters.hasPhone ? 1 : 0) + 
    (filters.hasWebsite ? 1 : 0) + 
    filters.cuisineTypes.length;

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (filters.priceRanges.length > 0 && !filters.priceRanges.includes(restaurant.priceRange)) {
      return false;
    }
    if (filters.minRating > 0 && restaurant.rating < filters.minRating) {
      return false;
    }
    if (filters.openNow && !restaurant.isOpen) {
      return false;
    }
    if (filters.hasPhone && !restaurant.phoneNumber) {
      return false;
    }
    if (filters.hasWebsite && !restaurant.website) {
      return false;
    }
    if (filters.cuisineTypes.length > 0 && !filters.cuisineTypes.includes(restaurant.cuisine || '')) {
      return false;
    }
    return true;
  });

  const enhanceSearchQuery = useCallback(async (query: string, location: string) => {
    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search-enhancer', {
        body: {
          query,
          location,
          userPreferences: {}
        }
      });

      if (error) throw error;

      return {
        enhancedQuery: data.enhancedQuery || query,
        suggestedCuisines: data.suggestedCuisines || [],
        suggestedPriceRange: data.suggestedPriceRange || [1, 2, 3, 4],
        interpretation: data.interpretation || ''
      };
    } catch (error) {
      console.error('Error enhancing search:', error);
      return {
        enhancedQuery: query,
        suggestedCuisines: [],
        suggestedPriceRange: [1, 2, 3, 4],
        interpretation: ''
      };
    } finally {
      setIsEnhancing(false);
    }
  }, []);


  // Enhanced search that combines both regular and AI discovery
  const handleUnifiedSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setRestaurants([]);

    // Use user's address as default location if no location specified
    const defaultLocation = searchLocation || profile?.address || 'current location';

    try {
      // Try AI discovery first for natural language queries
      const isNaturalLanguage = searchQuery.length > 10 && 
        (searchQuery.includes(' ') && !searchQuery.includes('restaurant')) ||
        /\b(looking for|want|need|find me|show me|recommend)\b/i.test(searchQuery);

      if (isNaturalLanguage) {
        // Use AI discovery for natural language queries
        const { data: discoverData, error: discoverError } = await supabase.functions.invoke('restaurant-discovery', {
          body: {
            query: searchQuery,
            location: defaultLocation,
            filters: {}
          }
        });

        if (!discoverError && discoverData?.restaurants?.length > 0) {
          // Transform discover results to search format
          const transformedResults: SearchRestaurant[] = discoverData.restaurants.map((restaurant: DiscoverRestaurant) => ({
            id: restaurant.id || Math.random().toString(36).substr(2, 9),
            name: restaurant.name,
            address: restaurant.address,
            rating: restaurant.rating || 0,
            reviewCount: restaurant.reviewCount,
            priceRange: restaurant.priceRange || 2,
            isOpen: restaurant.isOpen,
            phoneNumber: restaurant.phoneNumber,
            website: restaurant.website,
            openingHours: restaurant.openingHours ? [restaurant.openingHours] : [],
            photos: restaurant.images || [],
            location: {
              lat: restaurant.location?.lat || 0,
              lng: restaurant.location?.lng || 0,
            },
            cuisine: restaurant.cuisine || 'Restaurant',
            googleMapsUrl: restaurant.googleMapsUrl,
            michelinStars: restaurant.michelinStars,
            features: restaurant.features
          }));

          setRestaurants(transformedResults);
          toast.success(`Found ${transformedResults.length} restaurants using AI discovery`);
          return;
        }
      }

      // Fall back to regular search with AI enhancement
      const enhancedSearch = await enhanceSearchQuery(searchQuery, defaultLocation);
      
      if (enhancedSearch.interpretation) {
        toast.success(`AI interpreted: ${enhancedSearch.interpretation}`);
      }

      // Use the new restaurant-search function instead of restaurant-lookup
      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: {
          query: enhancedSearch.enhancedQuery,
          location: defaultLocation,
          radius: 10000,
          limit: 20
        }
      });
      if (error) {
        console.error('Restaurant search error:', error);
        throw error;
      }

      // The restaurant-search function returns restaurants directly
      const transformedResults: SearchRestaurant[] = (data.restaurants || []).map((restaurant: any) => ({
        ...restaurant,
        id: restaurant.id || Math.random().toString(36).substr(2, 9),
        currentDayHours: getCurrentDayHours(restaurant.openingHours || []),
      }));

      setRestaurants(transformedResults);
      
      toast.success(`Found ${transformedResults.length} restaurants`);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Search failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchLocation, profile?.address, enhanceSearchQuery, getCurrentDayHours]);

  const handleToggleWishlist = (restaurant: DiscoverRestaurant | SearchRestaurant) => {
    const existingRestaurant = existingRestaurants.find(r => 
      r.name.toLowerCase() === restaurant.name.toLowerCase() && 
      r.address === restaurant.address
    );

    if (existingRestaurant) {
      deleteRestaurant(existingRestaurant.id);
      toast.success(`Removed ${restaurant.name} from wishlist`);
    } else {
      const newRestaurant = {
        name: restaurant.name,
        address: restaurant.address,
        city: (restaurant as DiscoverRestaurant).location?.city || 'Unknown',
        cuisine: restaurant.cuisine || 'Unknown',
        priceRange: restaurant.priceRange,
        rating: 0,
        reviewCount: restaurant.reviewCount,
        googleMapsUrl: restaurant.googleMapsUrl,
        notes: '',
        isWishlist: true,
        latitude: restaurant.location?.lat,
        longitude: restaurant.location?.lng,
        website: restaurant.website,
        phoneNumber: restaurant.phoneNumber,
        photos: [] as File[],
      };

      addRestaurant(newRestaurant);
      toast.success(`Added ${restaurant.name} to wishlist!`);
    }
  };

  const handleSaveToWishlist = (restaurant: SearchRestaurant) => {
    const restaurantData = {
      name: restaurant.name,
      address: restaurant.address,
      city: 'Unknown',
      cuisine: restaurant.cuisine || 'Unknown',
      priceRange: restaurant.priceRange,
      rating: 0,
      reviewCount: restaurant.reviewCount,
      googleMapsUrl: restaurant.googleMapsUrl,
      notes: '',
      isWishlist: true,
      latitude: restaurant.location.lat,
      longitude: restaurant.location.lng,
      website: restaurant.website,
      phoneNumber: restaurant.phoneNumber,
      photos: [] as File[],
    };

    addRestaurant(restaurantData);
    toast.success(`${restaurant.name} saved to wishlist!`);
  };

  const handleViewDetails = (restaurant: SearchRestaurant) => {
    setDetailsRestaurant(restaurant);
    setDetailsModalOpen(true);
  };

  const handleAISuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowAIAssistant(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Trigger search automatically when suggestion is clicked
    setTimeout(() => {
      handleUnifiedSearch();
    }, 100);
  };

  const handleLocationSuggestionClick = (suggestion: any) => {
    setSearchLocation(suggestion.description);
    setShowLocationSuggestions(false);
  };

  const handleGoogleSearch = (restaurant: SearchRestaurant) => {
    const searchQuery = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
  };

  const getPriceDisplay = (range: number) => '$'.repeat(Math.min(range, 4));

  const handleMapRestaurantSelect = (restaurant: any) => {
    // Convert the map restaurant to SearchRestaurant format
    const searchRestaurant: SearchRestaurant = {
      ...restaurant,
      photos: restaurant.photos || []
    };
    setSelectedRestaurant(searchRestaurant);
  };

  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!hasSearched) {
      return (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Start Your Restaurant Search</h3>
          <p className="text-muted-foreground">
            Enter what you're craving and let our AI find the perfect restaurants for you
          </p>
        </div>
      );
    }

    if (filteredRestaurants.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms or filters
          </p>
          <Button variant="outline" onClick={() => setFilters({
            priceRanges: [],
            minRating: 0,
            openNow: false,
            hasPhone: false,
            hasWebsite: false,
            cuisineTypes: []
          })}>
            Clear Filters
          </Button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
            {restaurant.photos.length > 0 && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  {restaurant.isOpen !== undefined && (
                    <Badge variant={restaurant.isOpen ? "default" : "secondary"} className="text-xs">
                      {restaurant.isOpen ? "Open" : "Closed"}
                    </Badge>
                  )}
                  {restaurant.michelinStars && (
                    <Badge variant="default" className="bg-yellow-600 text-xs">
                      {restaurant.michelinStars}⭐ Michelin
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                    {restaurant.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveToWishlist(restaurant)}
                    className="shrink-0 ml-2"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center cursor-pointer" onClick={() => handleGoogleSearch(restaurant)}>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium hover:underline">{restaurant.rating}</span>
                  </div>
                  {restaurant.reviewCount && (
                    <span 
                      className="text-sm text-muted-foreground cursor-pointer hover:underline"
                      onClick={() => handleGoogleSearch(restaurant)}
                    >
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                  <div className="flex ml-auto">
                    <span className="text-lg font-bold text-green-600">
                      {getPriceDisplay(restaurant.priceRange)}
                    </span>
                  </div>
                </div>

                {restaurant.currentDayHours && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Today: {restaurant.currentDayHours}</span>
                  </div>
                )}

                {restaurant.website && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a 
                      href={restaurant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate"
                    >
                      {restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}

                <div className="flex items-start gap-1">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {restaurant.address}
                  </span>
                </div>

                {restaurant.cuisine && (
                  <Badge variant="outline" className="text-xs">
                    {restaurant.cuisine}
                  </Badge>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(restaurant)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  
                  {restaurant.phoneNumber && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${restaurant.phoneNumber}`, '_self')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {restaurant.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(restaurant.website, '_blank')}
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };


  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        activeTab="search"
        onTabChange={(tab) => {
          if (tab !== 'search') {
          navigate('/', { 
            state: { 
              activeTab: tab,
              searchQuery,
              searchLocation 
            } 
          });
          }
        }}
      />
      
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Smart Restaurant Search
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Describe what you're craving and let AI find the perfect restaurants for you
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Smart Restaurant Search
            </CardTitle>
            <CardDescription>
              Search using natural language or keywords - our AI will find the perfect restaurants
            </CardDescription>
          </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="What are you craving? (e.g., 'romantic Italian with outdoor seating' or 'best sushi')"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        generateSearchSuggestions(e.target.value);
                        setShowSuggestions(e.target.value.length > 1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnifiedSearch();
                          setShowSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowSuggestions(false);
                        }
                      }}
                      onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    />
                    
                    {/* Search Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {searchSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-64 relative">
                    <Input
                      placeholder="Location (optional)"
                      value={searchLocation}
                      onChange={(e) => {
                        setSearchLocation(e.target.value);
                        generateLocationSuggestions(e.target.value);
                        setShowLocationSuggestions(e.target.value.length > 1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUnifiedSearch();
                          setShowLocationSuggestions(false);
                        } else if (e.key === 'Escape') {
                          setShowLocationSuggestions(false);
                        }
                      }}
                      onFocus={() => searchLocation.length > 1 && setShowLocationSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 150)}
                    />
                    
                    {/* Location Suggestions */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                        {locationSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-muted cursor-pointer"
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
                   <Button 
                    onClick={() => {
                      handleUnifiedSearch();
                      setShowSuggestions(false);
                    }} 
                    disabled={isLoading || isEnhancing}
                    className="px-8"
                  >
                    {isLoading || isEnhancing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {isEnhancing ? 'Enhancing...' : 'Searching...'}
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAIAssistant(!showAIAssistant)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    AI Assistant
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </Button>

                  {hasSearched && filteredRestaurants.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowMap(!showMap)}
                      className="flex-1 sm:flex-initial"
                    >
                      {showMap ? <Grid3X3 className="h-4 w-4 mr-2" /> : <Map className="h-4 w-4 mr-2" />}
                      {showMap ? 'Grid View' : 'Map View'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Collapsible open={showFilters} onOpenChange={setShowFilters}>
              <CollapsibleContent>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                    <CardDescription>Refine your search results</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Price Range */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Price Range</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map((price) => (
                          <div key={price} className="flex items-center space-x-2">
                            <Checkbox
                              id={`price-${price}`}
                              checked={filters.priceRanges.includes(price)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  priceRanges: checked 
                                    ? [...prev.priceRanges, price]
                                    : prev.priceRanges.filter(p => p !== price)
                                }));
                              }}
                            />
                            <Label htmlFor={`price-${price}`} className="text-sm">
                              {getPriceDisplay(price)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Minimum Rating */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Minimum Rating: {filters.minRating > 0 ? `${filters.minRating}+` : 'Any'}
                      </Label>
                      <Slider
                        value={[filters.minRating]}
                        onValueChange={([value]) => setFilters(prev => ({ ...prev, minRating: value }))}
                        max={5}
                        step={0.5}
                        className="w-full"
                      />
                    </div>

                    {/* Cuisine Types */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Cuisine Types</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {cuisineOptions.map((cuisine) => (
                          <div key={cuisine} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cuisine-${cuisine}`}
                              checked={filters.cuisineTypes.includes(cuisine)}
                              onCheckedChange={(checked) => {
                                setFilters(prev => ({
                                  ...prev,
                                  cuisineTypes: checked 
                                    ? [...prev.cuisineTypes, cuisine]
                                    : prev.cuisineTypes.filter(c => c !== cuisine)
                                }));
                              }}
                            />
                            <Label htmlFor={`cuisine-${cuisine}`} className="text-sm">
                              {cuisine}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Filters */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Quick Filters</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="open-now"
                            checked={filters.openNow}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, openNow: !!checked }))}
                          />
                          <Label htmlFor="open-now" className="text-sm">Open now</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-phone"
                            checked={filters.hasPhone}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasPhone: !!checked }))}
                          />
                          <Label htmlFor="has-phone" className="text-sm">Has phone number</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="has-website"
                            checked={filters.hasWebsite}
                            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, hasWebsite: !!checked }))}
                          />
                          <Label htmlFor="has-website" className="text-sm">Has website</Label>
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          priceRanges: [],
                          minRating: 0,
                          openNow: false,
                          hasPhone: false,
                          hasWebsite: false,
                          cuisineTypes: []
                        })}
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Results Summary */}
            {hasSearched && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {filteredRestaurants.length === restaurants.length 
                    ? `Showing ${filteredRestaurants.length} restaurant${filteredRestaurants.length !== 1 ? 's' : ''}`
                    : `Showing ${filteredRestaurants.length} of ${restaurants.length} restaurant${restaurants.length !== 1 ? 's' : ''}`
                  }
                </div>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
                  </Badge>
                )}
              </div>
            )}

            {/* Results */}
            {showMap && hasSearched && filteredRestaurants.length > 0 ? (
              <div className="h-[600px] rounded-lg overflow-hidden">
                <RestaurantMapView
                  restaurants={filteredRestaurants.map(r => ({
                    ...r,
                    city: 'Unknown'
                  }))}
                  selectedRestaurant={selectedRestaurant}
                  onRestaurantSelect={handleMapRestaurantSelect}
                />
              </div>
            ) : (
              renderSearchResults()
            )}

        {/* AI Assistant */}
        {showAIAssistant && (
          <AISearchAssistant
            onSearchSuggestion={handleAISuggestion}
            onClose={() => setShowAIAssistant(false)}
          />
        )}

        {/* AI Chatbot (replacing voice assistant) */}
        <AIChatbot />

        {/* Restaurant Details Modal */}
        <RestaurantDetailsModal
          restaurant={detailsRestaurant}
          isOpen={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          onSaveToWishlist={handleSaveToWishlist}
        />
      </div>
    </div>
  );
}
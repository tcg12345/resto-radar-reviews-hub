import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useDiscover } from '@/contexts/DiscoverContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { RealtimeVoiceAssistant } from '@/components/RealtimeVoiceAssistant';
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
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [isVoiceSearch, setIsVoiceSearch] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Discover functionality state
  const {
    searchQuery: discoverQuery,
    setSearchQuery: setDiscoverQuery,
    locationQuery: discoverLocation,
    setLocationQuery: setDiscoverLocation,
    restaurants: discoverRestaurants,
    setRestaurants: setDiscoverRestaurants,
    hasSearched: discoverHasSearched,
    setHasSearched: setDiscoverHasSearched,
    isLoading: discoverIsLoading,
    setIsLoading: setDiscoverIsLoading,
  } = useDiscover();

  const [activeTab, setActiveTab] = useState<'search' | 'discover'>('search');
  
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

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setRestaurants([]);

    try {
      const enhancedSearch = await enhanceSearchQuery(searchQuery, searchLocation);
      
      if (enhancedSearch.interpretation) {
        toast.success(`AI interpreted: ${enhancedSearch.interpretation}`);
      }

      const { data, error } = await supabase.functions.invoke('restaurant-lookup', {
        body: {
          query: enhancedSearch.enhancedQuery,
          location: searchLocation || 'current location',
          radius: 10000,
          limit: 20
        }
      });

      if (error) throw error;

      const transformedResults: SearchRestaurant[] = (data.restaurants || []).map((restaurant: any) => ({
        id: restaurant.place_id || restaurant.id || Math.random().toString(36).substr(2, 9),
        name: restaurant.name,
        address: restaurant.formatted_address || restaurant.address,
        rating: restaurant.rating || 0,
        reviewCount: restaurant.user_ratings_total || restaurant.reviewCount,
        priceRange: restaurant.price_level || restaurant.priceRange || 2,
        isOpen: restaurant.opening_hours?.open_now,
        phoneNumber: restaurant.formatted_phone_number || restaurant.phoneNumber,
        website: restaurant.website,
        openingHours: restaurant.opening_hours?.weekday_text || restaurant.openingHours,
        photos: restaurant.photos?.map((photo: any) => 
          typeof photo === 'string' ? photo : photo.photo_reference || photo.url
        ).filter(Boolean) || [],
        location: {
          lat: restaurant.geometry?.location?.lat || restaurant.location?.lat || 0,
          lng: restaurant.geometry?.location?.lng || restaurant.location?.lng || 0,
        },
        cuisine: restaurant.types?.find((type: string) => 
          cuisineOptions.some(cuisine => 
            type.toLowerCase().includes(cuisine.toLowerCase()) || 
            cuisine.toLowerCase().includes(type.toLowerCase())
          )
        ) || restaurant.cuisine,
        googleMapsUrl: restaurant.url || restaurant.googleMapsUrl
      }));

      setRestaurants(transformedResults);
      
      toast.success(`Found ${transformedResults.length} restaurants`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search restaurants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchLocation, enhanceSearchQuery]);

  // Discover functionality
  const handleDiscoverSearch = useCallback(async () => {
    if (!discoverQuery.trim()) {
      toast.error('Please describe what type of restaurant you\'re looking for');
      return;
    }

    setDiscoverIsLoading(true);
    setDiscoverHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('restaurant-discovery', {
        body: {
          query: discoverQuery,
          location: discoverLocation,
          filters: {}
        }
      });

      if (error) throw error;

      setDiscoverRestaurants(data.restaurants || []);
      
      const resultCount = data.restaurants?.length || 0;
      const michelinCount = data.restaurants?.filter((r: DiscoverRestaurant) => r.michelinStars).length || 0;
      
      toast.success(`Found ${resultCount} restaurants${michelinCount > 0 ? `, including ${michelinCount} Michelin starred` : ''}`);
    } catch (error) {
      console.error('Discover search error:', error);
      setDiscoverRestaurants([]);
      toast.error('Could not search restaurants. Please try again.');
    } finally {
      setDiscoverIsLoading(false);
    }
  }, [discoverQuery, discoverLocation, setDiscoverRestaurants, setDiscoverHasSearched, setDiscoverIsLoading]);

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
    if (activeTab === 'search') {
      setSearchQuery(suggestion);
    } else {
      setDiscoverQuery(suggestion);
    }
    setShowAIAssistant(false);
  };

  const startVoiceSearch = () => {
    setIsVoiceSearch(true);
    setShowVoiceAssistant(true);
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
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium">{restaurant.rating}</span>
                  </div>
                  {restaurant.reviewCount && (
                    <span className="text-sm text-muted-foreground">
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                  <div className="flex ml-auto">
                    <span className="text-lg font-bold text-green-600">
                      {getPriceDisplay(restaurant.priceRange)}
                    </span>
                  </div>
                </div>

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

  const renderDiscoverResults = () => {
    if (discoverIsLoading) {
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

    if (!discoverHasSearched) {
      return (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">AI-Powered Restaurant Discovery</h3>
          <p className="text-muted-foreground">
            Describe your perfect dining experience in natural language and let AI find it for you
          </p>
        </div>
      );
    }

    if (discoverRestaurants.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
          <p className="text-muted-foreground">
            Try describing your ideal restaurant differently
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discoverRestaurants.map((restaurant) => (
          <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
            {restaurant.images && restaurant.images.length > 0 && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={restaurant.images[0]}
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
                    onClick={() => handleToggleWishlist(restaurant)}
                    className="shrink-0 ml-2"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 text-sm font-medium">{restaurant.rating}</span>
                  </div>
                  {restaurant.reviewCount && (
                    <span className="text-sm text-muted-foreground">
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                  <div className="flex ml-auto">
                    <span className="text-lg font-bold text-green-600">
                      {getPriceDisplay(restaurant.priceRange)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {restaurant.address}
                  </span>
                </div>

                <Badge variant="outline" className="text-xs">
                  {restaurant.cuisine}
                </Badge>

                <div className="flex gap-2 pt-2">
                  {restaurant.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(restaurant.website, '_blank')}
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Website
                    </Button>
                  )}
                  
                  {restaurant.phoneNumber && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`tel:${restaurant.phoneNumber}`, '_self')}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {restaurant.googleMapsUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(restaurant.googleMapsUrl, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
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
            navigate('/', { state: { activeTab: tab } });
          }
        }}
      />
      
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Discover & Search Restaurants
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Use AI to discover new restaurants or search with advanced filters
          </p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'discover')} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Advanced Search
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Discover
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Restaurant Search
                </CardTitle>
                <CardDescription>
                  Search for restaurants with detailed filters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search restaurants, cuisines, or dishes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="w-64">
                    <Input
                      placeholder="Location (optional)"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
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
                    onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Assistant
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
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-6">
            {/* Quick Stats */}
            {discoverHasSearched && discoverRestaurants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Average Rating</p>
                      <p className="text-2xl font-bold text-green-700">
                        {(discoverRestaurants.reduce((sum, r) => sum + r.rating, 0) / discoverRestaurants.length).toFixed(1)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Award className="h-8 w-8 text-amber-600" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Michelin Starred</p>
                      <p className="text-2xl font-bold text-amber-700">
                        {discoverRestaurants.filter(r => r.michelinStars).length}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <MapPin className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Unique Locations</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {new Set(discoverRestaurants.map(r => r.location?.city || 'Unknown')).size}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Discover Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  AI Restaurant Discovery
                </CardTitle>
                <CardDescription>
                  Describe your perfect dining experience in natural language
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="discover-query" className="text-sm font-medium">
                      What kind of restaurant are you looking for?
                    </Label>
                    <Input
                      id="discover-query"
                      placeholder="e.g., romantic Italian restaurant with outdoor seating for a special date night..."
                      value={discoverQuery}
                      onChange={(e) => setDiscoverQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDiscoverSearch()}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="discover-location" className="text-sm font-medium">
                      Location (optional)
                    </Label>
                    <Input
                      id="discover-location"
                      placeholder="e.g., downtown, near me, specific address..."
                      value={discoverLocation}
                      onChange={(e) => setDiscoverLocation(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDiscoverSearch()}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleDiscoverSearch} 
                  disabled={discoverIsLoading}
                  className="w-full"
                >
                  {discoverIsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Discovering...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Discover Restaurants
                    </>
                  )}
                </Button>

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
                    onClick={() => setShowVoiceAssistant(!showVoiceAssistant)}
                    className="flex-1 sm:flex-initial"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Voice Assistant
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Discover Results */}
            {renderDiscoverResults()}
          </TabsContent>
        </Tabs>

        {/* AI Assistant */}
        {showAIAssistant && (
          <AISearchAssistant
            onSearchSuggestion={handleAISuggestion}
            onClose={() => setShowAIAssistant(false)}
          />
        )}

        {/* Voice Assistant */}
        {showVoiceAssistant && (
          <RealtimeVoiceAssistant
            onClose={() => setShowVoiceAssistant(false)}
          />
        )}

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
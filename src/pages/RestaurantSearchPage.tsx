import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  Wand2
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
  const { addRestaurant } = useRestaurants();
  
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
  
  const [filters, setFilters] = useState<SearchFilters>({
    priceRanges: [],
    minRating: 0,
    openNow: false,
    hasPhone: false,
    hasWebsite: false,
    cuisineTypes: []
  });

  // Handle navigation between tabs
  const handleTabChange = (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'discover' | 'search') => {
    if (tab === 'search') {
      // Already on search page
      return;
    } else {
      // Navigate back to dashboard with the selected tab
      navigate('/', { state: { activeTab: tab } });
    }
  };

  const handleViewDetails = (restaurant: SearchRestaurant) => {
    setDetailsRestaurant(restaurant);
    setDetailsModalOpen(true);
  };

  const handleSaveToWishlist = async (restaurant: SearchRestaurant) => {
    try {
      await addRestaurant({
        name: restaurant.name,
        address: restaurant.address,
        city: searchLocation || 'Unknown',
        cuisine: restaurant.cuisine || 'Unknown',
        rating: restaurant.rating,
        priceRange: restaurant.priceRange,
        photos: [], // No photos for now
        notes: `Found via search. Original address: ${restaurant.address}`,
        isWishlist: true,
        useWeightedRating: false,
      });
      toast.success(`${restaurant.name} saved to your wishlist!`);
    } catch (error) {
      console.error('Error saving to wishlist:', error);
      toast.error('Failed to save to wishlist. Please try again.');
    }
  };

  const enhanceSearchWithAI = async () => {
    if (!searchQuery.trim()) return;

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-search-enhancer', {
        body: {
          query: searchQuery,
          location: searchLocation,
          userPreferences: {}
        }
      });

      if (error) throw error;

      if (data.enhancedQuery !== searchQuery) {
        setSearchQuery(data.enhancedQuery);
        toast.success('✨ Enhanced your search with AI insights!');
      }

      // Apply suggested filters automatically
      if (data.suggestedPriceRange && data.suggestedPriceRange.length < 4) {
        setFilters(prev => ({
          ...prev,
          priceRanges: data.suggestedPriceRange
        }));
      }

      if (data.mealType !== 'any') {
        // Could add meal type filter in the future
      }

      setTimeout(() => {
        handleSearch();
      }, 500);

    } catch (error) {
      console.error('Error enhancing search:', error);
      handleSearch(); // Fallback to regular search
    } finally {
      setIsEnhancing(false);
    }
  };

  const startVoiceSearch = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsVoiceSearch(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsVoiceSearch(false);
        
        // Auto-enhance and search
        setTimeout(() => {
          enhanceSearchWithAI();
        }, 500);
      };

      recognition.onerror = () => {
        setIsVoiceSearch(false);
        toast.error('Voice search failed. Please try again.');
      };

      recognition.onend = () => {
        setIsVoiceSearch(false);
      };

      recognition.start();
    } else {
      toast.error('Voice search not supported in this browser');
    }
  };

  const handleAISearchSuggestion = (query: string, location?: string) => {
    setSearchQuery(query);
    if (location) setSearchLocation(location);
    setShowAIAssistant(false);
    
    setTimeout(() => {
      enhanceSearchWithAI();
    }, 500);
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      // Call the restaurant-discovery Supabase function
      const { data, error } = await supabase.functions.invoke('restaurant-discovery', {
        body: {
          query: searchQuery,
          location: searchLocation || 'worldwide',
          filters: {}
        }
      });

      if (error) {
        console.error('Error calling restaurant-discovery function:', error);
        throw error;
      }

      if (data?.restaurants) {
        // Transform the response to match our Restaurant interface
        const transformedRestaurants: SearchRestaurant[] = data.restaurants.map((restaurant: any) => ({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          rating: restaurant.rating,
          reviewCount: restaurant.reviewCount,
          priceRange: restaurant.priceRange,
          isOpen: restaurant.isOpen,
          phoneNumber: restaurant.phoneNumber,
          website: restaurant.website,
          openingHours: restaurant.openingHours,
          photos: restaurant.images || [],
          location: {
            lat: restaurant.location.lat,
            lng: restaurant.location.lng
          },
          cuisine: restaurant.cuisine,
          googleMapsUrl: restaurant.googleMapsUrl
        }));

        setRestaurants(transformedRestaurants);
      } else {
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error searching restaurants:', error);
      setRestaurants([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, searchLocation]);

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (filters.priceRanges.length > 0 && !filters.priceRanges.includes(restaurant.priceRange)) {
      return false;
    }
    if (restaurant.rating < filters.minRating) return false;
    if (filters.openNow && !restaurant.isOpen) return false;
    if (filters.hasPhone && !restaurant.phoneNumber) return false;
    if (filters.hasWebsite && !restaurant.website) return false;
    return true;
  });

  const getPriceDisplay = (range: number) => '$'.repeat(Math.min(range, 4));

  const resetFilters = () => {
    setFilters({
      priceRanges: [],
      minRating: 0,
      openNow: false,
      hasPhone: false,
      hasWebsite: false,
      cuisineTypes: []
    });
  };

  const activeFiltersCount = [
    ...filters.priceRanges,
    filters.minRating > 0 ? 1 : 0,
    filters.openNow ? 1 : 0,
    filters.hasPhone ? 1 : 0,
    filters.hasWebsite ? 1 : 0,
    ...filters.cuisineTypes
  ].length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        activeTab="search" 
        onTabChange={handleTabChange} 
      />
      <div className="bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Restaurant Search
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover amazing restaurants worldwide using Google Places. Search by name, cuisine, or location.
          </p>
        </div>

        {/* Search Section */}
        <Card className="border-dashed border-2 hover:border-solid transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Restaurants
            </CardTitle>
            <CardDescription>
              Enter a restaurant name, cuisine type, or search query
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Input
                    placeholder="e.g., Italian restaurants, sushi, romantic dinner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && enhanceSearchWithAI()}
                    className="text-base pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 w-7 p-0 ${isVoiceSearch ? 'text-red-500' : 'text-muted-foreground'}`}
                      onClick={startVoiceSearch}
                      disabled={isVoiceSearch}
                    >
                      {isVoiceSearch ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-primary"
                      onClick={enhanceSearchWithAI}
                      disabled={!searchQuery.trim() || isEnhancing}
                    >
                      <Wand2 className={`h-4 w-4 ${isEnhancing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
                {isVoiceSearch && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    Listening... Speak now
                  </p>
                )}
              </div>
              <div>
                <Input
                  placeholder="Location (optional)"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={enhanceSearchWithAI} 
                disabled={!searchQuery.trim() || isEnhancing}
                className="flex-1 sm:flex-initial"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isEnhancing ? 'Enhancing...' : 'Smart Search'}
              </Button>

              <Button 
                onClick={handleSearch} 
                disabled={!searchQuery.trim() || isLoading}
                variant="outline"
                className="flex-1 sm:flex-initial"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>

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

              {hasSearched && (
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

        {/* AI Assistant */}
        {showAIAssistant && (
          <AISearchAssistant
            onSearchSuggestion={handleAISearchSuggestion}
            onClose={() => setShowAIAssistant(false)}
          />
        )}

        {/* Voice Assistant */}
        {showVoiceAssistant && (
          <RealtimeVoiceAssistant
            onClose={() => setShowVoiceAssistant(false)}
          />
        )}

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filters</CardTitle>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Price Range */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Price Range</label>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((price) => (
                        <div key={price} className="flex items-center space-x-2">
                          <Checkbox
                            id={`price-${price}`}
                            checked={filters.priceRanges.includes(price)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  priceRanges: [...prev.priceRanges, price]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  priceRanges: prev.priceRanges.filter(p => p !== price)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`price-${price}`} className="text-sm cursor-pointer">
                            {getPriceDisplay(price)} ({price === 1 ? 'Budget' : price === 2 ? 'Moderate' : price === 3 ? 'Expensive' : 'Very Expensive'})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Minimum Rating */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Minimum Rating</label>
                    <div className="space-y-2">
                      <Slider
                        value={[filters.minRating]}
                        onValueChange={([value]) => setFilters(prev => ({ ...prev, minRating: value }))}
                        max={5}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {filters.minRating.toFixed(1)}+ stars
                      </div>
                    </div>
                  </div>

                  {/* Status Filters */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Status</label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="open-now"
                          checked={filters.openNow}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, openNow: checked as boolean }))
                          }
                        />
                        <label htmlFor="open-now" className="text-sm cursor-pointer">
                          Open now
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-phone"
                          checked={filters.hasPhone}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasPhone: checked as boolean }))
                          }
                        />
                        <label htmlFor="has-phone" className="text-sm cursor-pointer">
                          Has phone number
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="has-website"
                          checked={filters.hasWebsite}
                          onCheckedChange={(checked) => 
                            setFilters(prev => ({ ...prev, hasWebsite: checked as boolean }))
                          }
                        />
                        <label htmlFor="has-website" className="text-sm cursor-pointer">
                          Has website
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Cuisine Type */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Cuisine Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cuisine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="italian">Italian</SelectItem>
                        <SelectItem value="french">French</SelectItem>
                        <SelectItem value="japanese">Japanese</SelectItem>
                        <SelectItem value="chinese">Chinese</SelectItem>
                        <SelectItem value="indian">Indian</SelectItem>
                        <SelectItem value="mexican">Mexican</SelectItem>
                        <SelectItem value="thai">Thai</SelectItem>
                        <SelectItem value="american">American</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Section */}
        {isLoading && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Searching restaurants...</h3>
                  <p className="text-muted-foreground">
                    Finding the best matches for "{searchQuery}"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasSearched && !isLoading && filteredRestaurants.length === 0 && (
          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              No restaurants found matching your search criteria. Try adjusting your filters or search terms.
            </AlertDescription>
          </Alert>
        )}

        {hasSearched && !isLoading && filteredRestaurants.length > 0 && (
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} found
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing results for "{searchQuery}"</span>
                {searchLocation && <span>in {searchLocation}</span>}
              </div>
            </div>

            {/* Results Grid */}
            {!showMap ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRestaurants.map((restaurant) => (
                        <div key={restaurant.id} className="space-y-4">
                          <Card className="group hover:shadow-lg transition-all duration-200 border-muted/50 hover:border-primary/30">
                            {/* Restaurant Image */}
                            <div className="aspect-[4/3] overflow-hidden bg-muted">
                              <img
                                src={restaurant.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'}
                                alt={restaurant.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>

                            <CardHeader className="pb-2">
                              <div className="space-y-2">
                                <CardTitle className="text-lg font-bold line-clamp-1">
                                  {restaurant.name}
                                </CardTitle>
                                
                                {/* Rating and Status */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-semibold">{restaurant.rating}</span>
                                    {restaurant.reviewCount && (
                                      <span className="text-xs text-muted-foreground">
                                        ({restaurant.reviewCount.toLocaleString()})
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {restaurant.isOpen !== undefined && (
                                      <Badge variant={restaurant.isOpen ? "default" : "secondary"}>
                                        {restaurant.isOpen ? "Open" : "Closed"}
                                      </Badge>
                                    )}
                                    <span className="text-lg font-bold text-green-600">
                                      {getPriceDisplay(restaurant.priceRange)}
                                    </span>
                                  </div>
                                </div>

                                {/* Cuisine and Location */}
                                <div className="space-y-1">
                                  {restaurant.cuisine && (
                                    <Badge variant="outline" className="text-xs">
                                      {restaurant.cuisine}
                                    </Badge>
                                  )}
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {restaurant.address}
                                  </p>
                                </div>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-3">
                              {/* Action Buttons */}
                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewDetails(restaurant)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleSaveToWishlist(restaurant)}
                                >
                                  <Heart className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* AI Review Summary */}
                          <AIReviewSummary
                            restaurantName={restaurant.name}
                            placeId={restaurant.id}
                          />
                        </div>
                      ))}
                    </div>
            ) : (
              /* Map View */
              <RestaurantMapView
                restaurants={filteredRestaurants as any}
                selectedRestaurant={selectedRestaurant as any}
                onRestaurantSelect={(restaurant) => {
                  const searchRestaurant = filteredRestaurants.find(r => r.id === restaurant.id);
                  if (searchRestaurant) setSelectedRestaurant(searchRestaurant);
                }}
              />
            )}
          </div>
        )}
      </div>
      </div>

      {/* Restaurant Details Modal */}
      <RestaurantDetailsModal
        restaurant={detailsRestaurant}
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        onSaveToWishlist={handleSaveToWishlist}
      />
    </div>
  );
}
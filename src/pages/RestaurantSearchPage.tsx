import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
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
  ChevronUp
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RestaurantMapView } from '@/components/RestaurantMapView';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount?: number;
  priceRange: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
  openingHours?: string;
  photos?: string[];
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    priceRanges: [],
    minRating: 0,
    openNow: false,
    hasPhone: false,
    hasWebsite: false,
    cuisineTypes: []
  });

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      // TODO: Implement Google Places API search
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data for demonstration
      const mockRestaurants: Restaurant[] = [
        {
          id: '1',
          name: 'The French Laundry',
          address: '6640 Washington St, Yountville, CA 94599',
          rating: 4.6,
          reviewCount: 2847,
          priceRange: 4,
          isOpen: false,
          phoneNumber: '+1 707-944-2380',
          website: 'https://www.thomaskeller.com/tfl',
          location: { lat: 38.4024, lng: -122.3617 },
          cuisine: 'French',
          photos: ['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop']
        },
        {
          id: '2',
          name: 'Osteria Francescana',
          address: 'Via Stella, 22, 41121 Modena MO, Italy',
          rating: 4.8,
          reviewCount: 1523,
          priceRange: 4,
          isOpen: true,
          phoneNumber: '+39 059 210118',
          website: 'https://www.osteriafrancescana.it/',
          location: { lat: 44.6471, lng: 10.9269 },
          cuisine: 'Italian',
          photos: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop']
        }
      ];

      setRestaurants(mockRestaurants);
    } catch (error) {
      console.error('Error searching restaurants:', error);
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  placeholder="e.g., Italian restaurants, sushi, The French Laundry..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-base"
                />
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
                onClick={handleSearch} 
                disabled={!searchQuery.trim() || isLoading}
                className="flex-1 sm:flex-initial"
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
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

            {/* Active Filters */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.priceRanges.map(price => (
                  <Badge key={price} variant="secondary" className="gap-1">
                    {getPriceDisplay(price)}
                    <button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        priceRanges: prev.priceRanges.filter(p => p !== price)
                      }))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filters.minRating > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {filters.minRating}+ stars
                    <button onClick={() => setFilters(prev => ({ ...prev, minRating: 0 }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.openNow && (
                  <Badge variant="secondary" className="gap-1">
                    Open now
                    <button onClick={() => setFilters(prev => ({ ...prev, openNow: false }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Results Grid */}
            {!showMap ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRestaurants.map((restaurant) => (
                  <Card key={restaurant.id} className="group hover:shadow-lg transition-all duration-200 border-muted/50 hover:border-primary/30">
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
                            <Badge variant={restaurant.isOpen ? "default" : "secondary"}>
                              {restaurant.isOpen ? "Open" : "Closed"}
                            </Badge>
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
                      {/* Contact Info */}
                      {(restaurant.phoneNumber || restaurant.website) && (
                        <div className="flex flex-wrap gap-2 text-sm">
                          {restaurant.phoneNumber && (
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </Button>
                          )}
                          {restaurant.website && (
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              Website
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm">
                          <MapPin className="h-3 w-3 mr-1" />
                          View on Map
                        </Button>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          More Info
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Map View */
              <RestaurantMapView
                restaurants={filteredRestaurants}
                selectedRestaurant={selectedRestaurant}
                onRestaurantSelect={setSelectedRestaurant}
              />
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
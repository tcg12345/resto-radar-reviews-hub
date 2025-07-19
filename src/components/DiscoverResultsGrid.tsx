import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  AlertCircle, 
  Star, 
  Award, 
  DollarSign,
  SortAsc,
  SortDesc,
  Filter,
  X
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DiscoverResultCard } from '@/components/DiscoverResultCard';

interface RestaurantResult {
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

interface DiscoverResultsGridProps {
  restaurants: RestaurantResult[];
  onToggleWishlist: (restaurant: RestaurantResult) => void;
  existingRestaurants: any[];
  searchQuery: string;
  isLoading: boolean;
  hasSearched: boolean;
}

type SortOption = 'rating' | 'price-low' | 'price-high' | 'michelin' | 'reviews';
type FilterOption = 'all' | 'michelin' | 'open' | 'budget' | 'upscale';

interface FilterState {
  minRating: number;
  priceRanges: number[];
  openingTime: string;
}

interface PriceFilter {
  value: number;
  label: string;
  count: number;
}

export function DiscoverResultsGrid({
  restaurants,
  onToggleWishlist,
  existingRestaurants,
  searchQuery,
  isLoading,
  hasSearched
}: DiscoverResultsGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    minRating: 0,
    priceRanges: [],
    openingTime: 'any'
  });

  // Check if restaurant is in wishlist
  const isInWishlist = (restaurant: RestaurantResult) => {
    return existingRestaurants.some(r => 
      r.name.toLowerCase() === restaurant.name.toLowerCase() && 
      r.address === restaurant.address
    );
  };

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = [...restaurants];

    // Apply category filters
    switch (filterBy) {
      case 'michelin':
        filtered = filtered.filter(r => r.michelinStars && r.michelinStars > 0);
        break;
      case 'open':
        filtered = filtered.filter(r => r.isOpen);
        break;
      case 'budget':
        filtered = filtered.filter(r => r.priceRange <= 2);
        break;
      case 'upscale':
        filtered = filtered.filter(r => r.priceRange >= 3);
        break;
      default:
        break;
    }

    // Apply advanced filters
    filtered = filtered.filter(r => {
      if (r.rating < advancedFilters.minRating) return false;
      if (advancedFilters.priceRanges.length > 0 && !advancedFilters.priceRanges.includes(r.priceRange)) return false;
      
      // Opening time filter (simplified - could be enhanced with actual time parsing)
      if (advancedFilters.openingTime !== 'any') {
        if (advancedFilters.openingTime === 'early' && !r.isOpen) return false;
        if (advancedFilters.openingTime === 'late' && !r.isOpen) return false;
      }
      
      return true;
    });

    return filtered;
  }, [restaurants, filterBy, advancedFilters]);

  // Sort restaurants
  const sortedRestaurants = useMemo(() => {
    const sorted = [...filteredRestaurants];

    switch (sortBy) {
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'price-low':
        return sorted.sort((a, b) => a.priceRange - b.priceRange);
      case 'price-high':
        return sorted.sort((a, b) => b.priceRange - a.priceRange);
      case 'michelin':
        return sorted.sort((a, b) => (b.michelinStars || 0) - (a.michelinStars || 0));
      case 'reviews':
        return sorted.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
      default:
        return sorted;
    }
  }, [filteredRestaurants, sortBy]);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Discovering restaurants...</h3>
              <p className="text-muted-foreground">
                Our AI is searching for the perfect matches based on your criteria
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No results state
  if (hasSearched && restaurants.length === 0) {
    return (
      <Alert className="border-dashed">
        <AlertCircle className="h-5 w-5" />
        <AlertDescription className="text-base">
          <div className="space-y-2">
            <p className="font-medium">No restaurants found matching your search.</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Try:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Broadening your search terms</li>
                <li>Trying a different location</li>
                <li>Using more general cuisine types</li>
                <li>Removing specific requirements</li>
              </ul>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // No search yet
  if (!hasSearched) {
    return null;
  }

  const michelinCount = restaurants.filter(r => r.michelinStars && r.michelinStars > 0).length;
  const openCount = restaurants.filter(r => r.isOpen).length;
  const averageRating = restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length;

  // Calculate price range counts for multi-select filter
  const priceFilters: PriceFilter[] = [
    { value: 1, label: '$ Budget', count: restaurants.filter(r => r.priceRange === 1).length },
    { value: 2, label: '$$ Moderate', count: restaurants.filter(r => r.priceRange === 2).length },
    { value: 3, label: '$$$ Expensive', count: restaurants.filter(r => r.priceRange === 3).length },
    { value: 4, label: '$$$$ Very Expensive', count: restaurants.filter(r => r.priceRange === 4).length },
  ].filter(filter => filter.count > 0);

  const handlePriceFilterChange = (priceValue: number, checked: boolean) => {
    setAdvancedFilters(prev => ({
      ...prev,
      priceRanges: checked 
        ? [...prev.priceRanges, priceValue]
        : prev.priceRanges.filter(p => p !== priceValue)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            Found {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Total reviews: {restaurants.reduce((sum, r) => sum + (r.reviewCount || 0), 0).toLocaleString()}</span>
            <span>•</span>
            <span>{new Set(restaurants.map(r => r.location?.city).filter(Boolean)).size} unique locations</span>
            {michelinCount > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3 text-amber-500" />
                  {michelinCount} Michelin starred
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
          
          <div className={`flex items-center gap-3 ${showFilters ? 'flex' : 'hidden lg:flex'}`}>
            <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All restaurants</SelectItem>
                <SelectItem value="michelin">Michelin starred</SelectItem>
                <SelectItem value="open">Open now</SelectItem>
                <SelectItem value="budget">Budget friendly</SelectItem>
                <SelectItem value="upscale">Upscale dining</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="michelin">Michelin stars</SelectItem>
                <SelectItem value="reviews">Most reviewed</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Rating</label>
                <Select 
                  value={advancedFilters.minRating.toString()} 
                  onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, minRating: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any rating</SelectItem>
                    <SelectItem value="3">3.0+ stars</SelectItem>
                    <SelectItem value="4">4.0+ stars</SelectItem>
                    <SelectItem value="4.5">4.5+ stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Select 
                  value={advancedFilters.priceRanges.length === 0 ? "all" : advancedFilters.priceRanges.join(",")} 
                  onValueChange={(value) => {
                    if (value === "all") {
                      setAdvancedFilters(prev => ({ ...prev, priceRanges: [] }));
                    } else {
                      setAdvancedFilters(prev => ({ ...prev, priceRanges: value.split(",").map(Number) }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All prices</SelectItem>
                    <SelectItem value="1">$ (Budget)</SelectItem>
                    <SelectItem value="2">$$ (Moderate)</SelectItem>
                    <SelectItem value="3">$$$ (Expensive)</SelectItem>
                    <SelectItem value="4">$$$$ (Very Expensive)</SelectItem>
                    <SelectItem value="1,2">$ - $$</SelectItem>
                    <SelectItem value="3,4">$$$ - $$$$</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Opening Time</label>
                <Select 
                  value={advancedFilters.openingTime} 
                  onValueChange={(value) => setAdvancedFilters(prev => ({ ...prev, openingTime: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="early">Open early (before 9 AM)</SelectItem>
                    <SelectItem value="late">Open late (after 10 PM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdvancedFilters({
                    minRating: 0,
                    priceRanges: [],
                    openingTime: 'any'
                  })}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Filters */}
      {filterBy !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filter:</span>
          <Badge variant="secondary" className="gap-1">
            {filterBy === 'michelin' && 'Michelin starred'}
            {filterBy === 'open' && 'Open now'}
            {filterBy === 'budget' && 'Budget friendly'}
            {filterBy === 'upscale' && 'Upscale dining'}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => setFilterBy('all')}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sortedRestaurants.map((restaurant) => (
          <DiscoverResultCard
            key={restaurant.id}
            restaurant={restaurant}
            onToggleWishlist={onToggleWishlist}
            isInWishlist={isInWishlist(restaurant)}
          />
        ))}
      </div>

      {/* No filtered results */}
      {sortedRestaurants.length === 0 && filteredRestaurants.length !== restaurants.length && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No restaurants match the current filter. Try adjusting your filters or{' '}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => setFilterBy('all')}
            >
              view all results
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
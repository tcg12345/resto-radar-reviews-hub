import { useState, useEffect, useRef } from 'react';
import { Plus, Check, ChevronDown, X, Sliders, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardList } from '@/components/RestaurantCardList';
import { ViewToggle, useViewToggle, ViewType } from '@/components/ViewToggle';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RatedRestaurantsFilterDialog } from '@/components/RatedRestaurantsFilterDialog';
import { resolveImageUrl } from '@/utils/imageUtils';

interface RatedRestaurantsPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void;
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
  shouldOpenAddDialog?: boolean;
  onAddDialogClose?: () => void;
  onNavigateToMap?: () => void;
  onOpenSettings?: () => void;
  onBackToLists?: () => void;
}

export function RatedRestaurantsPage({
  restaurants,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
  shouldOpenAddDialog,
  onAddDialogClose,
  onNavigateToMap,
  onOpenSettings,
  onBackToLists
}: RatedRestaurantsPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating-desc');
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterMichelins, setFilterMichelins] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState([0, 10]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { view, setView } = useViewToggle('grid' as ViewType);
  const hasHydratedRef = useRef(false);

  // Handle initial dialog opening
  useEffect(() => {
    if (shouldOpenAddDialog && !hasHydratedRef.current) {
      setIsAddDialogOpen(true);
      hasHydratedRef.current = true;
    }
  }, [shouldOpenAddDialog]);

  // Preload images for better UX
  useEffect(() => {
    const preloadImages = async () => {
      const imagesToPreload = restaurants
        .filter(r => r.photos && r.photos.length > 0)
        .slice(0, 20) // Limit to first 20 for performance
        .map(r => resolveImageUrl(r.photos[0]));
      
      const imagePromises = imagesToPreload.map(src => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(src);
          img.onerror = () => reject(src);
          img.src = src;
        });
      });
      
      try {
        await Promise.allSettled(imagePromises);
      } catch (error) {
        console.log('Some images failed to preload, continuing...');
      }
    };

    if (restaurants.length > 0) {
      preloadImages();
    }
  }, [restaurants]);

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating !== undefined && r.rating !== null);

  // Helper functions for multi-select filters
  const toggleCuisine = (cuisine: string) => {
    setFilterCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const togglePrice = (price: string) => {
    setFilterPrices(prev => 
      prev.includes(price) 
        ? prev.filter(p => p !== price)
        : [...prev, price]
    );
  };

  const toggleMichelin = (michelin: string) => {
    setFilterMichelins(prev => 
      prev.includes(michelin) 
        ? prev.filter(m => m !== michelin)
        : [...prev, michelin]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCuisines([]);
    setFilterPrices([]);
    setFilterMichelins([]);
    setRatingRange([0, 10]);
  };

  const applyRatingFilter = (restaurants: Restaurant[]) => {
    if (ratingRange[0] === 0 && ratingRange[1] === 10) return restaurants;
    return restaurants.filter(r => 
      r.rating !== undefined && r.rating !== null && 
      r.rating >= ratingRange[0] && r.rating <= ratingRange[1]
    );
  };

  // Get unique cuisines for filter dropdown
  const uniqueCuisines = [...new Set(ratedRestaurants.map(r => r.cuisine).filter(Boolean))];

  // Calculate filter counts with safety checks
  const getFilterCounts = () => {
    const cuisineCounts = uniqueCuisines.map(cuisine => ({
      cuisine,
      count: ratedRestaurants.filter(r => r.cuisine === cuisine).length
    })).sort((a, b) => b.count - a.count);

    const priceCounts = ['1', '2', '3', '4'].map(price => ({
      price,
      count: ratedRestaurants.filter(r => r.priceRange?.toString() === price).length
    })).filter(p => p.count > 0);

    const michelinCounts = ['1', '2', '3'].map(michelin => ({
      michelin,
      count: ratedRestaurants.filter(r => r.michelinStars?.toString() === michelin).length
    })).filter(m => m.count > 0);

    return { cuisineCounts, priceCounts, michelinCounts };
  };

  const { cuisineCounts = [], priceCounts = [], michelinCounts = [] } = getFilterCounts();

  // Filter and sort restaurants
  const filteredRestaurants = (() => {
    let filtered = ratedRestaurants;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(searchLower) ||
        r.cuisine.toLowerCase().includes(searchLower) ||
        r.address.toLowerCase().includes(searchLower) ||
        r.city.toLowerCase().includes(searchLower) ||
        r.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Apply cuisine filter
    if (filterCuisines.length > 0) {
      filtered = filtered.filter(r => filterCuisines.includes(r.cuisine));
    }

    // Apply price filter
    if (filterPrices.length > 0) {
      filtered = filtered.filter(r => 
        r.priceRange && filterPrices.includes(r.priceRange.toString())
      );
    }

    // Apply michelin filter
    if (filterMichelins.length > 0) {
      filtered = filtered.filter(r => 
        r.michelinStars && filterMichelins.includes(r.michelinStars.toString())
      );
    }

    // Apply rating range filter
    filtered = applyRatingFilter(filtered);

    // Apply sorting
    switch (sortBy) {
      case 'rating-desc':
        return filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'rating-asc':
        return filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      case 'date-desc':
        return filtered.sort((a, b) => {
          const dateA = a.dateVisited ? new Date(a.dateVisited) : new Date(a.createdAt);
          const dateB = b.dateVisited ? new Date(b.dateVisited) : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
      case 'date-asc':
        return filtered.sort((a, b) => {
          const dateA = a.dateVisited ? new Date(a.dateVisited) : new Date(a.createdAt);
          const dateB = b.dateVisited ? new Date(b.dateVisited) : new Date(b.createdAt);
          return dateA.getTime() - dateB.getTime();
        });
      case 'name-asc':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return filtered.sort((a, b) => b.name.localeCompare(a.name));
      case 'custom':
        return filtered.sort((a, b) => (a.customRank || 999) - (b.customRank || 999));
      default:
        return filtered;
    }
  })();

  // Event handlers
  const handleOpenEditDialog = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setIsAddDialogOpen(true);
  };

  const handleOpenDeleteDialog = (restaurantId: string) => {
    setRestaurantToDelete(restaurantId);
  };

  const handleEdit = async (data: RestaurantFormData) => {
    if (editingRestaurant) {
      await onEditRestaurant(editingRestaurant.id, data);
    } else {
      await onAddRestaurant(data);
    }
    setEditingRestaurant(null);
    setIsAddDialogOpen(false);
    onAddDialogClose?.();
  };

  const handleDelete = async () => {
    if (restaurantToDelete) {
      await onDeleteRestaurant(restaurantToDelete);
      setRestaurantToDelete(null);
    }
  };

  return (
    <div className="w-full max-w-none mobile-container">
      {/* Modern Compact Toolbar */}
      <div className="px-4 lg:px-6 py-3 border-b border-border/50">
        {/* Action Buttons Row */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="hidden lg:block text-2xl font-semibold">Rated Restaurants</h2>
          <div className="flex items-center gap-2">
            <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
            <Button 
              size="sm" 
              onClick={() => setIsAddDialogOpen(true)} 
              className="h-8 px-3 rounded-md text-sm"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Restaurant
            </Button>
            {onNavigateToMap && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onNavigateToMap} 
                className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm"
              >
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                Map
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Input
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 h-9 rounded-md border-border/50 focus:border-border"
            />
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* Filter Buttons - Desktop */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {/* Clear Filters Button */}
            {(filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0 || ratingRange[0] > 0 || ratingRange[1] < 10) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}

            {/* Cuisine Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm justify-between min-w-[100px]"
                >
                  <span className="truncate">
                    {filterCuisines.length === 0 
                      ? 'Cuisine' 
                      : filterCuisines.length === 1 
                        ? filterCuisines[0] 
                        : `${filterCuisines.length} cuisines`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    {cuisineCounts.map(({ cuisine, count }) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={filterCuisines.includes(cuisine)}
                          onCheckedChange={() => toggleCuisine(cuisine)}
                        />
                        <label htmlFor={`cuisine-${cuisine}`} className="text-sm cursor-pointer flex-1">
                          {cuisine} ({count})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Price Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm justify-between min-w-[80px]"
                >
                  <span>
                    {filterPrices.length === 0 
                      ? 'Price' 
                      : filterPrices.length === 1 
                        ? filterPrices[0] === '1' ? '$' : filterPrices[0] === '2' ? '$$' : filterPrices[0] === '3' ? '$$$' : '$$$$'
                        : `${filterPrices.length} prices`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    {priceCounts.map(({ price, count }) => (
                      <div key={price} className="flex items-center space-x-2">
                        <Checkbox
                          id={`price-${price}`}
                          checked={filterPrices.includes(price)}
                          onCheckedChange={() => togglePrice(price)}
                        />
                        <label htmlFor={`price-${price}`} className="text-sm cursor-pointer flex-1">
                          {price === '1' ? '$' : price === '2' ? '$$' : price === '3' ? '$$$' : '$$$$'} ({count})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Michelin Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm justify-between min-w-[90px]"
                >
                  <span>
                    {filterMichelins.length === 0 
                      ? 'Michelin' 
                      : filterMichelins.length === 1 
                        ? `${filterMichelins[0]} Star${filterMichelins[0] === '1' ? '' : 's'}`
                        : `${filterMichelins.length} selected`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-3 w-3 flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    {michelinCounts.map(({ michelin, count }) => (
                      <div key={michelin} className="flex items-center space-x-2">
                        <Checkbox
                          id={`michelin-${michelin}`}
                          checked={filterMichelins.includes(michelin)}
                          onCheckedChange={() => toggleMichelin(michelin)}
                        />
                        <label htmlFor={`michelin-${michelin}`} className="text-sm cursor-pointer flex-1">
                          {`${michelin} Michelin Star${michelin === '1' ? '' : 's'}`} ({count})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort & Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0">
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Sort by</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="mt-1 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rating-desc">Rating (High to Low)</SelectItem>
                        <SelectItem value="rating-asc">Rating (Low to High)</SelectItem>
                        <SelectItem value="date-desc">Date Visited (Newest)</SelectItem>
                        <SelectItem value="date-asc">Date Visited (Oldest)</SelectItem>
                        <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                        <SelectItem value="custom">Custom Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Rating Range: {ratingRange[0]} - {ratingRange[1]}</Label>
                    <div className="mt-2">
                      <Slider
                        value={ratingRange}
                        onValueChange={setRatingRange}
                        max={10}
                        min={0}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Mobile Filter Button */}
          <div className="sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileFilters(true)}
              className="h-8 px-3 rounded-md border-border/50 hover:border-border text-sm"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Restaurant Content */}
      <div className="px-4 lg:px-6 py-4">
        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {searchTerm || filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0 || ratingRange[0] > 0 || ratingRange[1] < 10 ? (
                <>
                  No restaurants match your current filters.
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">No rated restaurants yet</h3>
                  <p className="text-sm mb-4">Start rating restaurants to build your collection</p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Restaurant
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {filteredRestaurants.map((restaurant) => (
              view === 'grid' ? (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={() => handleOpenEditDialog(restaurant)}
                  onDelete={() => handleOpenDeleteDialog(restaurant.id)}
                />
              ) : (
                <RestaurantCardList
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={() => handleOpenEditDialog(restaurant)}
                  onDelete={() => handleOpenDeleteDialog(restaurant.id)}
                />
              )
            ))}
          </div>
        )}
      </div>

      <RestaurantDialog
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingRestaurant(null);
            onAddDialogClose?.();
          }
        }}
        restaurant={editingRestaurant || undefined}
        onSave={handleEdit}
        dialogType={editingRestaurant ? 'edit' : 'add'}
      />

      <ConfirmDialog
        isOpen={!!restaurantToDelete}
        onOpenChange={(open) => !open && setRestaurantToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Restaurant"
        description="Are you sure you want to delete this restaurant? This action cannot be undone."
      />

      <RatedRestaurantsFilterDialog
        open={showMobileFilters}
        onOpenChange={setShowMobileFilters}
        filterCuisines={filterCuisines}
        filterPrices={filterPrices}
        filterMichelins={filterMichelins}
        ratingRange={ratingRange as [number, number]}
        sortBy={sortBy as any}
        onCuisineToggle={toggleCuisine}
        onPriceToggle={togglePrice}
        onMichelinToggle={toggleMichelin}
        onRatingRangeChange={setRatingRange}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
        cuisineCounts={cuisineCounts}
        priceCounts={priceCounts}
        michelinCounts={michelinCounts}
      />
    </div>
  );
}
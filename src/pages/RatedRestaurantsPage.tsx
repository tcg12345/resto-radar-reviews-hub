import { useState, useEffect, useRef } from 'react';
import { Plus, Check, ChevronDown, X, Sliders, MapPin, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardList } from '@/components/RestaurantCardList';
import { ViewToggle, useViewToggle } from '@/components/ViewToggle';
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
  shouldOpenAddDialog = false,
  onAddDialogClose,
  onNavigateToMap,
  onOpenSettings,
}: RatedRestaurantsPageProps) {
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'rating-high' | 'rating-low' | 'name-az' | 'name-za' | 'price-low' | 'price-high' | 'michelin-high' | 'michelin-low'>('rating-high');
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterMichelins, setFilterMichelins] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, 10]);
  const { view, setView } = useViewToggle('rated-restaurants-view', 'grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const photosLoadedRef = useRef(false);
  const [cachedRestaurants, setCachedRestaurants] = useState<Restaurant[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const sourceRestaurants = restaurants.length > 0 ? restaurants : cachedRestaurants;
  const ratedRestaurants = sourceRestaurants.filter((r) => !r.isWishlist);

  // Handle opening the add dialog when triggered from HomePage
  useEffect(() => {
    if (shouldOpenAddDialog) {
      setIsAddDialogOpen(true);
      onAddDialogClose?.();
    }
  }, [shouldOpenAddDialog, onAddDialogClose]);

  // Hydrate from localStorage for instant first paint
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ratedRestaurantsCache');
      if (raw) {
        const parsed: Restaurant[] = JSON.parse(raw);
        setCachedRestaurants(parsed);
      }
    } catch (e) {
      console.warn('Failed to load ratedRestaurantsCache');
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist cache when real data arrives
  useEffect(() => {
    if (restaurants.length > 0 && ratedRestaurants.length > 0) {
      try {
        localStorage.setItem('ratedRestaurantsCache', JSON.stringify(ratedRestaurants));
      } catch (e) {
        // ignore
      }
    }
  }, [restaurants.length, ratedRestaurants.length]);

  // Preload cover photos for faster perceived load, limited to first 10 for performance
  useEffect(() => {
    if (ratedRestaurants.length > 0 && !photosLoadedRef.current) {
      photosLoadedRef.current = true;
const preloadImages = async () => {
  const coverPhotos = ratedRestaurants
    .filter(r => r.photos && r.photos.length > 0)
    .slice(0, 10)  // only preload first 10 images for performance
    .map(r => resolveImageUrl(r.photos[0], { width: 800 }))
    .filter(Boolean);
  const preloadPromises = coverPhotos.map(url => new Promise<void>((resolve) => {
    // Add prefetch hint
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = url as string;
      document.head.appendChild(link);
    } catch {}
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Don't block on errors
    img.src = url as string;
  }));
  // Fire-and-forget
  Promise.allSettled(preloadPromises);
};
      preloadImages();
    }
  }, [ratedRestaurants.length]);

  // Get unique cuisines
  const cuisines = Array.from(new Set(ratedRestaurants.map(r => r.cuisine).filter(cuisine => cuisine && cuisine.trim() !== '')));

  // Helper functions for multi-select
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
    setFilterCuisines([]);
    setFilterPrices([]);
    setFilterMichelins([]);
    setRatingRange([0, 10]);
    setTempRatingRange([0, 10]);
  };

  const applyRatingFilter = () => {
    setRatingRange(tempRatingRange);
  };

  // Calculate counts for each filter option based on current filters
  const getFilterCounts = () => {
    const baseFilteredRestaurants = ratedRestaurants.filter((restaurant) => {
      const matchesSearch = searchTerm === '' 
        || restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
        || restaurant.city.toLowerCase().includes(searchTerm.toLowerCase())
        || restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRating = !restaurant.rating || 
        (restaurant.rating >= ratingRange[0] && restaurant.rating <= ratingRange[1]);
      
      return matchesSearch && matchesRating;
    });

    // Calculate counts for each cuisine
    const cuisineCounts = cuisines.map(cuisine => ({
      cuisine,
      count: baseFilteredRestaurants.filter(r => 
        r.cuisine === cuisine &&
        (filterPrices.length === 0 || 
         (r.priceRange && filterPrices.includes(r.priceRange.toString()))) &&
         (filterMichelins.length === 0 || 
          (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length
    }));

    // Calculate counts for each price range
    const priceCounts = [
      { price: '1', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 1 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
         (filterMichelins.length === 0 || 
          (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '2', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 2 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
         (filterMichelins.length === 0 || 
          (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '3', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 3 &&
         (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
         (filterMichelins.length === 0 || 
          (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '4', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 4 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
         (filterMichelins.length === 0 || 
          (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
    ];

    // Calculate counts for Michelin stars
    const michelinCounts = [
      { michelin: '1', count: baseFilteredRestaurants.filter(r => 
        r.michelinStars === 1 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterPrices.length === 0 || 
         (r.priceRange && filterPrices.includes(r.priceRange.toString())))
      ).length },
      { michelin: '2', count: baseFilteredRestaurants.filter(r => 
        r.michelinStars === 2 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterPrices.length === 0 || 
         (r.priceRange && filterPrices.includes(r.priceRange.toString())))
      ).length },
      { michelin: '3', count: baseFilteredRestaurants.filter(r => 
        r.michelinStars === 3 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterPrices.length === 0 || 
         (r.priceRange && filterPrices.includes(r.priceRange.toString())))
      ).length },
    ];

    return { cuisineCounts, priceCounts, michelinCounts };
  };

  const { cuisineCounts, priceCounts, michelinCounts } = getFilterCounts();

  // Filter and sort restaurants
  const filteredRestaurants = ratedRestaurants
    .filter((restaurant) => {
      // Apply search filter
      const matchesSearch = searchTerm === '' 
        || restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
        || restaurant.city.toLowerCase().includes(searchTerm.toLowerCase())
        || restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());

      // Apply cuisine filter
      const matchesCuisine = filterCuisines.length === 0 
        || filterCuisines.includes(restaurant.cuisine);

      // Apply price filter
      const matchesPrice = filterPrices.length === 0 
        || (restaurant.priceRange && filterPrices.includes(restaurant.priceRange.toString()));

      // Apply Michelin star filter
      const matchesMichelin = filterMichelins.length === 0 
        || (restaurant.michelinStars && filterMichelins.includes(restaurant.michelinStars.toString()));

      // Apply rating range filter
      const matchesRating = !restaurant.rating || 
        (restaurant.rating >= ratingRange[0] && restaurant.rating <= ratingRange[1]);

      return matchesSearch && matchesCuisine && matchesPrice && matchesMichelin && matchesRating;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortBy === 'latest') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortBy === 'rating-high') {
        return (b.rating || 0) - (a.rating || 0);
      } else if (sortBy === 'rating-low') {
        return (a.rating || 0) - (b.rating || 0);
      } else if (sortBy === 'name-az') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'name-za') {
        return b.name.localeCompare(a.name);
      } else if (sortBy === 'price-low') {
        return (a.priceRange || 0) - (b.priceRange || 0);
      } else if (sortBy === 'price-high') {
        return (b.priceRange || 0) - (a.priceRange || 0);
      } else if (sortBy === 'michelin-high') {
        return (b.michelinStars || 0) - (a.michelinStars || 0);
      } else if (sortBy === 'michelin-low') {
        return (a.michelinStars || 0) - (b.michelinStars || 0);
      }
      return 0;
    });

  const handleOpenEditDialog = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setIsEditDialogOpen(true);
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleEdit = (data: RestaurantFormData) => {
    if (selectedRestaurant) {
      onEditRestaurant(selectedRestaurant.id, data);
    }
  };

  const handleDelete = () => {
    if (selectedRestaurant) {
      onDeleteRestaurant(selectedRestaurant.id);
    }
  };

  return (
    <div className="w-full max-w-none py-6 mobile-container px-4 lg:px-6">
      <div className="mb-4 lg:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="hidden lg:block text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Rated Restaurants</h2>
        <div className="flex items-center gap-2">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)} className="mobile-button">
            <Plus className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
            Add Restaurant
          </Button>
          {onNavigateToMap && (
            <Button variant="outline" size="sm" onClick={onNavigateToMap} className="mobile-button">
              <MapPin className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="ml-1">Map</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile layout - Search + Filter button */}
      <div className="mb-6 flex items-center gap-2 sm:hidden">
        <div className="flex-1">
          <Input
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileFilters(true)}
          className="h-10 w-10 p-0"
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Desktop layout - Original layout */}
      <div className="mb-6 hidden sm:flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            placeholder="Search restaurants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:ml-auto">
          {/* Clear Filters Button */}
          {(filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0 || ratingRange[0] > 0 || ratingRange[1] < 10) && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="flex-shrink-0">
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}

          {/* Cuisine Filter */}
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterCuisines.length === 0 
                      ? 'Cuisine' 
                      : filterCuisines.length === 1 
                        ? filterCuisines[0]
                        : `${filterCuisines.length} cuisines`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
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
          </div>

          {/* Price Filter */}
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterPrices.length === 0 
                      ? 'Price' 
                      : filterPrices.length === 1 
                        ? filterPrices[0] === '1' ? '$' : filterPrices[0] === '2' ? '$$' : filterPrices[0] === '3' ? '$$$' : '$$$$'
                        : `${filterPrices.length} prices`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
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
          </div>

          {/* Michelin Filter */}
          <div className="flex-1 min-w-[140px] max-w-[180px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                      {filterMichelins.length === 0 
                        ? 'Michelin' 
                        : filterMichelins.length === 1 
                          ? `${filterMichelins[0]} Star${filterMichelins[0] === '1' ? '' : 's'}`
                          : `${filterMichelins.length} selected`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
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
          </div>

          {/* Sort & Filter */}
          <div className="flex-shrink-0 w-[60px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-center p-2">
                  <Sliders className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0">
                <div className="p-4">
                  <div className="space-y-6">
                    {/* Sort Options */}
                    <div>
                      <Label className="text-sm font-medium">Sort By</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button
                          variant={sortBy === 'latest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('latest')}
                          className="justify-start"
                        >
                          Latest
                        </Button>
                        <Button
                          variant={sortBy === 'oldest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('oldest')}
                          className="justify-start"
                        >
                          Oldest
                        </Button>
                        <Button
                          variant={sortBy === 'rating-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('rating-high')}
                          className="justify-start"
                        >
                          Rating ↓
                        </Button>
                        <Button
                          variant={sortBy === 'rating-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('rating-low')}
                          className="justify-start"
                        >
                          Rating ↑
                        </Button>
                        <Button
                          variant={sortBy === 'name-az' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('name-az')}
                          className="justify-start"
                        >
                          Name A-Z
                        </Button>
                        <Button
                          variant={sortBy === 'name-za' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('name-za')}
                          className="justify-start"
                        >
                          Name Z-A
                        </Button>
                        <Button
                          variant={sortBy === 'price-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('price-low')}
                          className="justify-start"
                        >
                          Price ↑
                        </Button>
                        <Button
                          variant={sortBy === 'price-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('price-high')}
                          className="justify-start"
                        >
                          Price ↓
                        </Button>
                        <Button
                          variant={sortBy === 'michelin-high' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('michelin-high')}
                          className="justify-start"
                        >
                          Michelin ↓
                        </Button>
                        <Button
                          variant={sortBy === 'michelin-low' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSortBy('michelin-low')}
                          className="justify-start"
                        >
                          Michelin ↑
                        </Button>
                      </div>
                    </div>

                    {/* Rating Range Filter */}
                    <div>
                      <Label className="text-sm font-medium">Rating Range</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{tempRatingRange[0]}</span>
                        <Slider
                          value={tempRatingRange}
                          onValueChange={(value) => setTempRatingRange(value as [number, number])}
                          max={10}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">{tempRatingRange[1]}</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={applyRatingFilter} size="sm">
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {filteredRestaurants.length === 0 && ((restaurants.length === 0 && cachedRestaurants.length === 0) || (searchTerm || filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0 || ratingRange[0] > 0 || ratingRange[1] < 10)) ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">No rated restaurants yet</h3>
          <p className="mb-4 text-muted-foreground">
            {searchTerm || filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0 || ratingRange[0] > 0 || ratingRange[1] < 10
              ? "No restaurants match your search criteria."
              : "Start adding restaurants you've visited!"}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Restaurant
          </Button>
        </div>
        ) : (
          <div className={view === 'grid' ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
            {filteredRestaurants.map((restaurant) => (
              view === 'grid' ? (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                  showAIReviewAssistant={true}
                />
              ) : (
                <RestaurantCardList
                  key={restaurant.id}
                  restaurant={restaurant}
                  onEdit={handleOpenEditDialog}
                  onDelete={handleOpenDeleteDialog}
                />
              )
            ))}
          </div>
        )}

      <RestaurantDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={onAddRestaurant}
        dialogType="add"
      />

      <RestaurantDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        restaurant={selectedRestaurant}
        onSave={handleEdit}
        dialogType="edit"
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Restaurant"
        description="Are you sure you want to delete this restaurant? This action cannot be undone."
        confirmText="Delete"
      />

      {/* Mobile Filter Dialog */}
      <RatedRestaurantsFilterDialog
        open={showMobileFilters}
        onOpenChange={setShowMobileFilters}
        filterCuisines={filterCuisines}
        filterPrices={filterPrices}
        filterMichelins={filterMichelins}
        ratingRange={ratingRange}
        sortBy={sortBy}
        cuisineCounts={cuisineCounts}
        priceCounts={priceCounts}
        michelinCounts={michelinCounts}
        onCuisineToggle={toggleCuisine}
        onPriceToggle={togglePrice}
        onMichelinToggle={toggleMichelin}
        onRatingRangeChange={setRatingRange}
        onSortByChange={setSortBy}
        onClearFilters={clearFilters}
      />
    </div>
  );
}
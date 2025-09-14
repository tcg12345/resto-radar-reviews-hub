import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useRestaurantLists } from '@/hooks/useRestaurantLists';
import { CreateListDialog } from '@/components/CreateListDialog';

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
  const { lists, createList, getRestaurantsInList } = useRestaurantLists();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [cachedLists, setCachedLists] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'rating-high' | 'rating-low' | 'name-az' | 'name-za' | 'price-low'
| 'price-high' | 'michelin-high' | 'michelin-low'>('rating-high');
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
  const [listRestaurants, setListRestaurants] = useState<Restaurant[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);

  const refreshSelectedList = useCallback(() => {
    if (!selectedListId) return;
    setIsListLoading(true);
    getRestaurantsInList(selectedListId)
      .then(setListRestaurants)
      .finally(() => setIsListLoading(false));
  }, [selectedListId, getRestaurantsInList]);

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

  // Hydrate lists from localStorage for instant first paint
  useEffect(() => {
    try {
      const raw = localStorage.getItem('restaurantListsCache');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCachedLists(parsed);
      }
    } catch (e) {
      console.warn('Failed to load restaurantListsCache');
    }
  }, []);

  // Persist lists cache when real data arrives
  useEffect(() => {
    if (lists.length > 0) {
      try {
        localStorage.setItem('restaurantListsCache', JSON.stringify(lists));
      } catch (e) {
        // ignore
      }
    }
  }, [lists]);

  // Use cached lists if real lists haven't loaded yet
  const displayLists = lists.length > 0 ? lists : cachedLists;

  // Load restaurants for the selected list
  useEffect(() => {
    if (selectedListId) {
      refreshSelectedList();
    } else {
      setListRestaurants([]);
    }
  }, [selectedListId, refreshSelectedList]);

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
  const cuisines = Array.from(new Set(ratedRestaurants.map(r => r.cuisine).filter(cuisine => cuisine && cuisine.trim() !== '')))
;

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
  const displayRestaurants = selectedListId ? listRestaurants : ratedRestaurants;

  const filteredRestaurants = displayRestaurants
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

  const handleAdd = async (data: RestaurantFormData) => {
    await Promise.resolve(onAddRestaurant(data));
    if (selectedListId) {
      refreshSelectedList();
    }
  };

  const handleEdit = async (data: RestaurantFormData) => {
    if (selectedRestaurant) {
      await Promise.resolve(onEditRestaurant(selectedRestaurant.id, data));
      if (selectedListId) {
        refreshSelectedList();
      }
    }
  };

  const handleDelete = async () => {
    if (selectedRestaurant) {
      await Promise.resolve(onDeleteRestaurant(selectedRestaurant.id));
      if (selectedListId) {
        refreshSelectedList();
      }
    }
  };

  return (
    <div className="w-full max-w-none py-6 mobile-container px-4 lg:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-trans
parent">Rated Restaurants</h2>
          <p className="text-sm text-muted-foreground">Manage and organize your dining experiences</p>
        </div>
        <div className="hidden sm:flex flex-wrap items-center gap-2">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
          <Button variant="outline" size="sm" onClick={() => setIsCreateListDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3 lg:h-4 lg:w-4" />
            New List
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3 lg:h-4 lg:w-4" />
            Add Restaurant
          </Button>
          {onNavigateToMap && (
            <Button variant="outline" size="sm" onClick={onNavigateToMap}>
              <MapPin className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="ml-1">Map</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Compact Toolbar */}
      <div className="sm:hidden space-y-3 mb-6">
        {/* Single Row – View Toggle and Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="rated-restaurants-view" />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsCreateListDialogOpen(true)}
              className="h-8 px-3 text-xs rounded-xl"
            >
              <Plus className="mr-1 h-3 w-3" />
              Create List
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-8 px-3 text-xs rounded-xl"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Restaurant
            </Button>
            {onNavigateToMap && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToMap}
                className="h-8 px-3 text-xs rounded-xl"
              >
                <MapPin className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder="Search restaurants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 rounded-xl border border-border bg-background"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(true)}
              className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-muted/50 rounded-lg"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lists Preview */}
      <div className="mb-4 sm:hidden">
        <h3 className="text-lg font-medium mb-2">Your Lists</h3>
        <div className="flex space-x-3 overflow-x-auto py-2">
          <Button
            variant={selectedListId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedListId(null)}
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs"
          >
            All
          </Button>
          {displayLists.map((list) => (
            <Button
              key={list.id}
              variant={selectedListId === list.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedListId(list.id)}
              className="whitespace-nowrap rounded-full px-3 py-1 text-xs"
            >
              {list.name}
            </Button>
          ))}
        </div>
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
                      <div className="mt-2 flex items center space-x-2">
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

      {selectedListId && isListLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading list...</div>
      ) : selectedListId && displayRestaurants.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">No restaurants in this list</h3>
          <p className="mb-4 text-muted-foreground">This list is empty. Add some restaurants to get started!</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Restaurant
          </Button>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">
            {displayRestaurants.length === 0 ? 'No rated restaurants yet' : 'No restaurants found'}
          </h3>
          <p className="mb-4 text-muted-foreground">
            {displayRestaurants.length === 0
              ? "Start adding restaurants you've visited!"
              : 'No restaurants match your search criteria.'}
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {displayRestaurants.length === 0 ? 'Add Your First Restaurant' : 'Add Restaurant'}
          </Button>
        </div>
      ) : (
        <div className={view === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
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
        onSave={handleAdd}
        dialogType="add"
        defaultSelectedListId={selectedListId || undefined}
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

      <CreateListDialog
        isOpen={isCreateListDialogOpen}
        onClose={() => setIsCreateListDialogOpen(false)}
        onCreateList={createList}
      />
    </div>
  );
}



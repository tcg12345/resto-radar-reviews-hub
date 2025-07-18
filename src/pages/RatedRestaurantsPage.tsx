import { useState } from 'react';
import { Plus, Check, ChevronDown, X, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface RatedRestaurantsPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void;
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
}

export function RatedRestaurantsPage({
  restaurants,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
}: RatedRestaurantsPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'rating' | 'name'>('latest');
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [filterMichelins, setFilterMichelins] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);

  const ratedRestaurants = restaurants.filter((r) => !r.isWishlist);

  // Get unique cuisines
  const cuisines = Array.from(new Set(ratedRestaurants.map(r => r.cuisine)));

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
         (filterMichelins.includes('none') && !r.michelinStars) ||
         (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length
    }));

    // Calculate counts for each price range
    const priceCounts = [
      { price: '1', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 1 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterMichelins.length === 0 || 
         (filterMichelins.includes('none') && !r.michelinStars) ||
         (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '2', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 2 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterMichelins.length === 0 || 
         (filterMichelins.includes('none') && !r.michelinStars) ||
         (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '3', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 3 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterMichelins.length === 0 || 
         (filterMichelins.includes('none') && !r.michelinStars) ||
         (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
      { price: '4', count: baseFilteredRestaurants.filter(r => 
        r.priceRange === 4 &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterMichelins.length === 0 || 
         (filterMichelins.includes('none') && !r.michelinStars) ||
         (r.michelinStars && filterMichelins.includes(r.michelinStars.toString())))
      ).length },
    ];

    // Calculate counts for Michelin stars
    const michelinCounts = [
      { michelin: 'none', count: baseFilteredRestaurants.filter(r => 
        !r.michelinStars &&
        (filterCuisines.length === 0 || filterCuisines.includes(r.cuisine)) &&
        (filterPrices.length === 0 || 
         (r.priceRange && filterPrices.includes(r.priceRange.toString())))
      ).length },
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
        || (filterMichelins.includes('none') && !restaurant.michelinStars)
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
      } else if (sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else {
        return a.name.localeCompare(b.name);
      }
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
    <div className="container py-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold tracking-tight">Rated Restaurants</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Restaurant
        </Button>
      </div>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
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
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}

          {/* Cuisine Filter */}
          <div className="w-[180px]">
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
          <div className="w-[180px]">
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
          <div className="w-[180px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filterMichelins.length === 0 
                      ? 'Michelin' 
                      : filterMichelins.length === 1 
                        ? filterMichelins[0] === 'none' ? 'No Stars' : `${filterMichelins[0]} Star${filterMichelins[0] === '1' ? '' : 's'}`
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
                          {michelin === 'none' ? 'No Michelin Stars' : `${michelin} Michelin Star${michelin === '1' ? '' : 's'}`} ({count})
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Rating Range Filter */}
          <div className="w-[60px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-center p-2">
                  <Sliders className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0">
                <div className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Rating Range</Label>
                      <div className="mt-2 flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{ratingRange[0]}</span>
                        <Slider
                          value={ratingRange}
                          onValueChange={(value) => setRatingRange(value as [number, number])}
                          max={10}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">{ratingRange[1]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Sort By */}
          <div className="w-[180px]">
            <Select value={sortBy} onValueChange={(value: 'latest' | 'rating' | 'name') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="rating">Rating (High to Low)</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredRestaurants.length === 0 ? (
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onEdit={handleOpenEditDialog}
              onDelete={handleOpenDeleteDialog}
            />
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
    </div>
  );
}
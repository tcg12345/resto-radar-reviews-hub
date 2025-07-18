import { useState } from 'react';
import { Plus, Check, ChevronDown, X } from 'lucide-react';
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
  };

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
        || (filterPrices.includes('none') && !restaurant.priceRange)
        || (restaurant.priceRange && filterPrices.includes(restaurant.priceRange.toString()));

      // Apply Michelin star filter
      const matchesMichelin = filterMichelins.length === 0 
        || (filterMichelins.includes('none') && !restaurant.michelinStars)
        || (restaurant.michelinStars && filterMichelins.includes(restaurant.michelinStars.toString()));

      return matchesSearch && matchesCuisine && matchesPrice && matchesMichelin;
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
          {(filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0) && (
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
                    {cuisines.map((cuisine) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={filterCuisines.includes(cuisine)}
                          onCheckedChange={() => toggleCuisine(cuisine)}
                        />
                        <label htmlFor={`cuisine-${cuisine}`} className="text-sm cursor-pointer">
                          {cuisine}
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
                        ? filterPrices[0] === 'none' ? 'No Price Set' : filterPrices[0] === '1' ? '$' : filterPrices[0] === '2' ? '$$' : filterPrices[0] === '3' ? '$$$' : '$$$$'
                        : `${filterPrices.length} prices`
                    }
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-none"
                        checked={filterPrices.includes('none')}
                        onCheckedChange={() => togglePrice('none')}
                      />
                      <label htmlFor="price-none" className="text-sm cursor-pointer">
                        No Price Set
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-1"
                        checked={filterPrices.includes('1')}
                        onCheckedChange={() => togglePrice('1')}
                      />
                      <label htmlFor="price-1" className="text-sm cursor-pointer">
                        $ (Budget)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-2"
                        checked={filterPrices.includes('2')}
                        onCheckedChange={() => togglePrice('2')}
                      />
                      <label htmlFor="price-2" className="text-sm cursor-pointer">
                        $$ (Moderate)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-3"
                        checked={filterPrices.includes('3')}
                        onCheckedChange={() => togglePrice('3')}
                      />
                      <label htmlFor="price-3" className="text-sm cursor-pointer">
                        $$$ (Expensive)
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="price-4"
                        checked={filterPrices.includes('4')}
                        onCheckedChange={() => togglePrice('4')}
                      />
                      <label htmlFor="price-4" className="text-sm cursor-pointer">
                        $$$$ (Very Expensive)
                      </label>
                    </div>
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="michelin-none"
                        checked={filterMichelins.includes('none')}
                        onCheckedChange={() => toggleMichelin('none')}
                      />
                      <label htmlFor="michelin-none" className="text-sm cursor-pointer">
                        No Michelin Stars
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="michelin-1"
                        checked={filterMichelins.includes('1')}
                        onCheckedChange={() => toggleMichelin('1')}
                      />
                      <label htmlFor="michelin-1" className="text-sm cursor-pointer">
                        1 Michelin Star
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="michelin-2"
                        checked={filterMichelins.includes('2')}
                        onCheckedChange={() => toggleMichelin('2')}
                      />
                      <label htmlFor="michelin-2" className="text-sm cursor-pointer">
                        2 Michelin Stars
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="michelin-3"
                        checked={filterMichelins.includes('3')}
                        onCheckedChange={() => toggleMichelin('3')}
                      />
                      <label htmlFor="michelin-3" className="text-sm cursor-pointer">
                        3 Michelin Stars
                      </label>
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
            {searchTerm || filterCuisines.length > 0 || filterPrices.length > 0 || filterMichelins.length > 0
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
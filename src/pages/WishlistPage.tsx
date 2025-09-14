import { useState } from 'react';
import { Plus, Heart, RotateCcw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantCardList } from '@/components/RestaurantCardList';
import { ViewToggle, useViewToggle } from '@/components/ViewToggle';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface WishlistPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void;
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
  onRefresh?: () => void;
  onNavigateToMap?: () => void;
}

export function WishlistPage({
  restaurants,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
  onRefresh,
  onNavigateToMap,
}: WishlistPageProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCity, setActiveCity] = useState<string>('all');
  const { view, setView } = useViewToggle('wishlist-view', 'grid');

  const wishlistRestaurants = restaurants.filter((r) => r.isWishlist);
  
  // Get unique cities and sort alphabetically
  const cities = Array.from(new Set(wishlistRestaurants.map(r => r.city).filter(city => city && city.trim() !== ''))).sort();

  // Filter restaurants
  const filteredRestaurants = wishlistRestaurants
    .filter((restaurant) => {
      // Apply search filter
      const matchesSearch = searchTerm === '' 
        || restaurant.name.toLowerCase().includes(searchTerm.toLowerCase())
        || restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase());

      // Apply city filter
      const matchesCity = activeCity === 'all' || restaurant.city === activeCity;

      return matchesSearch && matchesCity;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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

  const handleAddRestaurant = (data: RestaurantFormData) => {
    onAddRestaurant({
      ...data,
      isWishlist: true,
    });
  };

  return (
    <div className="w-full max-w-none py-6 mobile-container">
      {/* Desktop Header */}
      <div className="hidden sm:block mb-4 lg:mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center px-4 lg:px-6">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Restaurant Wishlist</h2>
        <div className="flex items-center gap-2">
          <ViewToggle currentView={view} onViewChange={setView} storageKey="wishlist-view" />
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
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="mobile-button">
              <RotateCcw className="h-3 w-3 lg:h-4 lg:w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="sm:hidden">
        <div className="space-y-4">
          
          {/* 🔍 Search Bar - Full Width, Compact */}
          <div className="w-full">
            <div className="relative premium-search-container rounded-lg shadow-md">
              <Input
                placeholder="Search wishlist..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-4 pr-4 rounded-lg border-0 text-base font-medium text-white placeholder:text-slate-300 bg-transparent focus:ring-0 focus:outline-none"
              />
            </div>
          </div>

          {/* ➕ Action Buttons - Full Width, Compact */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="premium-button-primary flex-1 h-10 rounded-lg font-semibold text-base text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Restaurant
            </button>
            <Select value={activeCity} onValueChange={setActiveCity}>
              <SelectTrigger className="premium-button-secondary flex-1 h-10 rounded-lg font-semibold text-base text-white shadow-md border-0">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🛠 Utility Icons - Larger & Clear */}
          <div className="flex items-center justify-center gap-6 pt-1">
            {/* Grid View Toggle */}
            <button
              onClick={() => setView('grid')}
              className={`premium-icon-button w-10 h-10 rounded-full transition-all duration-200 ${
                view === 'grid' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-600/70'
              }`}
            >
              <div className="w-4 h-4 grid grid-cols-2 gap-1 mx-auto">
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
              </div>
            </button>
            
            {/* List View Toggle */}
            <button
              onClick={() => setView('list')}
              className={`premium-icon-button w-10 h-10 rounded-full transition-all duration-200 ${
                view === 'list' 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-600/70'
              }`}
            >
              <div className="w-4 h-4 flex flex-col gap-1 mx-auto mt-1">
                <div className="w-full h-0.5 bg-current rounded-full"></div>
                <div className="w-full h-0.5 bg-current rounded-full"></div>
                <div className="w-full h-0.5 bg-current rounded-full"></div>
                <div className="w-3/4 h-0.5 bg-current rounded-full"></div>
              </div>
            </button>

            {/* Map Icon */}
            {onNavigateToMap && (
              <button
                onClick={onNavigateToMap}
                className="premium-icon-button w-10 h-10 rounded-full bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-600/70 transition-all duration-200 flex items-center justify-center"
              >
                <MapPin className="w-4 h-4" />
              </button>
            )}

            {/* Refresh Icon */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="premium-icon-button w-10 h-10 rounded-full bg-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-600/70 transition-all duration-200 flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Search and filter controls */}
      <div className="hidden sm:block mb-3 lg:mb-6 flex flex-col sm:flex-row mobile-grid-compact lg:gap-4 px-4 lg:px-6">
        <div className="flex-1">
          <Input
            placeholder="Search wishlist..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mobile-button h-8 lg:h-10 text-sm"
          />
        </div>
        <Select value={activeCity} onValueChange={setActiveCity}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 lg:h-10 text-sm mobile-button">
            <SelectValue placeholder="All Cities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>{city}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-4 lg:px-6">

      {cities.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
          <h3 className="mb-2 text-lg font-medium">Your wishlist is empty</h3>
          <p className="mb-4 text-muted-foreground">
            Add restaurants you want to visit in the future.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Your First Wishlist Item
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="all" onValueChange={setActiveCity} value={activeCity}>
          <ScrollArea className="w-full whitespace-nowrap mb-8">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="all">All Cities</TabsTrigger>
              {cities.map((city) => (
                <TabsTrigger key={city} value={city}>
                  {city}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          <TabsContent value={activeCity}>
            {filteredRestaurants.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/50 p-8 text-center">
                <h3 className="mb-2 text-lg font-medium">No restaurants found</h3>
                <p className="mb-4 text-muted-foreground">
                  {searchTerm
                    ? "No restaurants match your search criteria."
                    : "No restaurants in this city yet."}
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Restaurant
                </Button>
              </div>
            ) : (
              <div className={view === 'grid' ? "grid gap-3 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
                {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="relative">
                    {view === 'grid' ? (
                      <RestaurantCard
                        restaurant={restaurant}
                        onEdit={handleOpenEditDialog}
                        onDelete={handleOpenDeleteDialog}
                      />
                    ) : (
                      <RestaurantCardList
                        restaurant={restaurant}
                        onEdit={handleOpenEditDialog}
                        onDelete={handleOpenDeleteDialog}
                      />
                    )}
                    {view === 'grid' && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-3 right-3 h-8 w-8 bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleOpenDeleteDialog(restaurant.id)}
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <RestaurantDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddRestaurant}
        dialogType="add"
        defaultWishlist={true}
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
        title="Remove from Wishlist"
        description="Are you sure you want to remove this restaurant from your wishlist?"
        confirmText="Remove"
      />
      </div>
    </div>
  );
}
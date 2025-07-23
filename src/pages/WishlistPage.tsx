import { useState } from 'react';
import { Plus, Heart, RotateCcw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const wishlistRestaurants = restaurants.filter((r) => r.isWishlist);
  
  // Get unique cities
  const cities = Array.from(new Set(wishlistRestaurants.map(r => r.city)));

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
    <div className="container py-6 mobile-container px-4 sm:px-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Restaurant Wishlist</h2>
        <div className="flex items-center gap-2">
          {onNavigateToMap && (
            <Button variant="outline" onClick={onNavigateToMap}>
              <MapPin className="h-4 w-4" />
            </Button>
          )}
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add to Wishlist
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search wishlist..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

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
          <TabsList className="mb-8">
            <TabsTrigger value="all">All Cities</TabsTrigger>
            {cities.map((city) => (
              <TabsTrigger key={city} value={city}>
                {city}
              </TabsTrigger>
            ))}
          </TabsList>
          
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
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="relative">
                    <RestaurantCard
                      restaurant={restaurant}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleOpenDeleteDialog}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute top-3 right-3 h-8 w-8 bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleOpenDeleteDialog(restaurant.id)}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
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
  );
}
import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Star, DollarSign, MapPin } from 'lucide-react';

interface MapPageProps {
  restaurants: Restaurant[];
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
}

export function MapPage({ restaurants, onEditRestaurant, onDeleteRestaurant }: MapPageProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cuisine: 'all',
    priceRange: 'all',
    rating: 'all',
    type: 'all' // 'all', 'rated', 'wishlist'
  });
  
  const handleRestaurantSelect = (id: string) => {
    setSelectedRestaurantId(id);
  };
  
  const handleOpenEditDialog = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setSelectedRestaurantId(null); // Close the map dialog
      setIsEditDialogOpen(true);
    }
  };

  const handleOpenDeleteDialog = (id: string) => {
    const restaurant = restaurants.find((r) => r.id === id);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setSelectedRestaurantId(null); // Close the map dialog
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

  const clearFilters = () => {
    setFilters({
      cuisine: 'all',
      priceRange: 'all',
      rating: 'all',
      type: 'all'
    });
  };

  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(([key, value]) => 
      key !== 'type' && value !== 'all' && value !== ''
    ).length + (filters.type !== 'all' ? 1 : 0);
  };
  
  // Find the restaurant for the map dialog
  const mapSelectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  
  // Apply filters
  const filteredRestaurants = restaurants.filter(restaurant => {
    // Type filter
    if (filters.type === 'rated' && restaurant.isWishlist) return false;
    if (filters.type === 'wishlist' && !restaurant.isWishlist) return false;
    
    // Cuisine filter
    if (filters.cuisine && filters.cuisine !== 'all' && restaurant.cuisine !== filters.cuisine) return false;
    
    // Price range filter
    if (filters.priceRange && filters.priceRange !== 'all' && restaurant.priceRange?.toString() !== filters.priceRange) return false;
    
    // Rating filter
    if (filters.rating && filters.rating !== 'all') {
      const minRating = parseFloat(filters.rating);
      if (!restaurant.rating || restaurant.rating < minRating) return false;
    }
    
    return true;
  });
  
  // Filter restaurants that have coordinates
  const restaurantsWithCoords = filteredRestaurants.filter(
    restaurant => restaurant.latitude && restaurant.longitude
  );

  // Get unique cuisines and price ranges for filter options
  const uniqueCuisines = [...new Set(restaurants.map(r => r.cuisine))].sort();
  const uniquePriceRanges = [...new Set(restaurants.map(r => r.priceRange).filter(Boolean))].sort();

  return (
    <div className="relative h-[calc(100vh-64px)]">
      {/* Filter Panel - moved further right to avoid overlapping with filter button */}
      {showFilters && (
        <Card className="absolute top-16 left-4 z-10 w-80 max-h-[calc(100vh-140px)] overflow-y-auto shadow-lg border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Restaurants</SelectItem>
                  <SelectItem value="rated">Rated Only</SelectItem>
                  <SelectItem value="wishlist">Wishlist Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cuisine</label>
              <Select value={filters.cuisine} onValueChange={(value) => setFilters(prev => ({ ...prev, cuisine: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any cuisine</SelectItem>
                  {uniqueCuisines.map(cuisine => (
                    <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Select value={filters.priceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any price</SelectItem>
                  {uniquePriceRanges.map(range => (
                    <SelectItem key={range} value={range.toString()}>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        {'$'.repeat(range)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum Rating</label>
              <Select value={filters.rating} onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any rating</SelectItem>
                  <SelectItem value="7">7+ stars</SelectItem>
                  <SelectItem value="8">8+ stars</SelectItem>
                  <SelectItem value="9">9+ stars</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={() => setShowFilters(false)} className="flex-1">
                Apply
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {restaurantsWithCoords.length} of {restaurants.length} restaurants
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toggle Button - moved to left to avoid blocking map controls */}
      <Button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute top-4 left-4 z-20 flex items-center gap-2"
        variant={showFilters ? "default" : "secondary"}
      >
        <Filter className="h-4 w-4" />
        Filters
        {getActiveFilterCount() > 0 && (
          <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
            {getActiveFilterCount()}
          </Badge>
        )}
      </Button>

      <MapView 
        restaurants={restaurantsWithCoords} 
        onRestaurantSelect={handleRestaurantSelect} 
      />
      
      {/* Map popup dialog */}
      <Dialog 
        open={!!mapSelectedRestaurant} 
        onOpenChange={(open) => !open && setSelectedRestaurantId(null)}
      >
        <DialogContent className="max-w-lg">
          <ScrollArea className="max-h-[80vh]">
            {mapSelectedRestaurant && (
              <RestaurantCard 
                restaurant={mapSelectedRestaurant}
                onEdit={handleOpenEditDialog}
                onDelete={handleOpenDeleteDialog}
                showAIReviewAssistant={true}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <RestaurantDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        restaurant={selectedRestaurant}
        onSave={handleEdit}
        dialogType="edit"
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Restaurant"
        description="Are you sure you want to delete this restaurant? This action cannot be undone."
        confirmText="Delete"
      />
      
      {restaurantsWithCoords.length === 0 && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background p-6 shadow-lg">
          <h3 className="mb-2 text-lg font-semibold">No locations to display</h3>
          <p className="text-muted-foreground">
            Add restaurants with addresses to see them on the map.
          </p>
        </div>
      )}
    </div>
  );
}
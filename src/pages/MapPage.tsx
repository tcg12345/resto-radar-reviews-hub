import { useState, useEffect } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { Filter, X, Star, DollarSign, MapPin, ChevronDown, GripVertical, ArrowLeft } from 'lucide-react';

interface MapPageProps {
  restaurants: Restaurant[];
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
}

export function MapPage({ restaurants, onEditRestaurant, onDeleteRestaurant }: MapPageProps) {
  const navigate = useNavigate();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCuisines, setFilterCuisines] = useState<string[]>([]);
  const [filterPrices, setFilterPrices] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>([0, 10]);
  const [filterType, setFilterType] = useState<'all' | 'rated' | 'wishlist'>('all');
  
  // Drag functionality for filter box - calculate position dynamically when opened
  const getInitialPosition = () => {
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    return { x: 16, y: Math.max(16, viewportHeight - 700) }; // Increased offset to position box higher
  };
  
  const [filterPosition, setFilterPosition] = useState(getInitialPosition());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset position when filters are opened
  useEffect(() => {
    if (showFilters) {
      setFilterPosition(getInitialPosition());
    }
  }, [showFilters]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - filterPosition.x,
      y: e.clientY - filterPosition.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Keep filter box within viewport bounds
    const maxX = window.innerWidth - 320; // 320px is the width of the filter box
    const maxY = window.innerHeight - 200; // minimum height to keep it visible
    
    setFilterPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);
  
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

  // Multi-select helper functions
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

  const clearFilters = () => {
    setFilterCuisines([]);
    setFilterPrices([]);
    setRatingRange([0, 10]);
    setTempRatingRange([0, 10]);
    setFilterType('all');
  };

  const applyRatingFilter = () => {
    setRatingRange(tempRatingRange);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filterCuisines.length > 0) count++;
    if (filterPrices.length > 0) count++;
    if (ratingRange[0] > 0 || ratingRange[1] < 10) count++;
    if (filterType !== 'all') count++;
    return count;
  };
  
  // Find the restaurant for the map dialog
  const mapSelectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  
  // Apply filters
  const filteredRestaurants = restaurants.filter(restaurant => {
    // Type filter
    if (filterType === 'rated' && restaurant.isWishlist) return false;
    if (filterType === 'wishlist' && !restaurant.isWishlist) return false;
    
    // Cuisine filter (multi-select)
    if (filterCuisines.length > 0 && !filterCuisines.includes(restaurant.cuisine)) return false;
    
    // Price range filter (multi-select)
    if (filterPrices.length > 0 && (!restaurant.priceRange || !filterPrices.includes(restaurant.priceRange.toString()))) return false;
    
    // Rating filter (range) - hide wishlist items when any rating filter is applied
    if (ratingRange[0] > 0 || ratingRange[1] < 10) {
      // Hide all wishlist items when rating filter is active
      if (restaurant.isWishlist) return false;
      // Apply rating filter to non-wishlist restaurants with ratings
      if (restaurant.rating && (restaurant.rating < ratingRange[0] || restaurant.rating > ratingRange[1])) return false;
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
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
      {/* Back Arrow */}
      <Button
        onClick={() => {
          // Try to go back in history, but fallback to rated restaurants if no history
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/rated');
          }
        }}
        className="absolute top-4 left-4 z-30 flex items-center gap-2"
        variant="secondary"
        size="sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Button>
      {/* Filter Panel - draggable positioned filter box */}
      {showFilters && (
        <Card 
          className="absolute z-10 w-80 max-h-[calc(100vh-160px)] overflow-y-auto shadow-lg border-2 select-none"
          style={{ 
            left: `${filterPosition.x}px`, 
            top: `${filterPosition.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          <CardHeader 
            className="pb-4 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 pointer-events-none">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFilters(false)}
                className="h-8 w-8 pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filterType} onValueChange={(value: 'all' | 'rated' | 'wishlist') => setFilterType(value)}>
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

            {/* Cuisine Filter - Multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cuisine</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {filterCuisines.length === 0 
                        ? 'Any cuisine' 
                        : filterCuisines.length === 1 
                          ? filterCuisines[0]
                          : `${filterCuisines.length} cuisines`
                      }
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <div className="p-2">
                    <div className="space-y-2">
                      {uniqueCuisines.map((cuisine) => (
                        <div key={cuisine} className="flex items-center space-x-2">
                          <Checkbox
                            id={`cuisine-${cuisine}`}
                            checked={filterCuisines.includes(cuisine)}
                            onCheckedChange={() => toggleCuisine(cuisine)}
                          />
                          <label htmlFor={`cuisine-${cuisine}`} className="text-sm cursor-pointer flex-1">
                            {cuisine}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Price Filter - Multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {filterPrices.length === 0 
                        ? 'Any price' 
                        : filterPrices.length === 1 
                          ? filterPrices[0] === '1' ? '$' : filterPrices[0] === '2' ? '$$' : filterPrices[0] === '3' ? '$$$' : '$$$$'
                          : `${filterPrices.length} prices`
                      }
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <div className="p-2">
                    <div className="space-y-2">
                      {uniquePriceRanges.map((price) => (
                        <div key={price} className="flex items-center space-x-2">
                          <Checkbox
                            id={`price-${price}`}
                            checked={filterPrices.includes(price.toString())}
                            onCheckedChange={() => togglePrice(price.toString())}
                          />
                          <label htmlFor={`price-${price}`} className="text-sm cursor-pointer flex-1">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-3 w-3" />
                              {'$'.repeat(price)}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Rating Range Slider */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Rating Range</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-muted-foreground min-w-[20px] text-center">{tempRatingRange[0]}</span>
                  <Slider
                    value={tempRatingRange}
                    onValueChange={(value) => setTempRatingRange(value as [number, number])}
                    max={10}
                    min={0}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground min-w-[20px] text-center">{tempRatingRange[1]}</span>
                </div>
                <Button onClick={applyRatingFilter} size="sm" className="w-full">
                  Apply Rating
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1">
                Clear All
              </Button>
              <Button onClick={() => setShowFilters(false)} className="flex-1">
                Close
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {restaurantsWithCoords.length} of {restaurants.length} restaurants
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Toggle Button - moved to bottom-left to avoid overlapping with back arrow */}
      <Button
        onClick={() => setShowFilters(!showFilters)}
        className="absolute bottom-4 left-4 z-20 flex items-center gap-2"
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
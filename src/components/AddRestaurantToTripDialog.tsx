import { useState, useEffect } from 'react';
import { Plus, Star, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { useAuth } from '@/contexts/AuthContext';

interface AddRestaurantToTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string | null;
}

export function AddRestaurantToTripDialog({ isOpen, onClose, tripId }: AddRestaurantToTripDialogProps) {
  const { user } = useAuth();
  const { restaurants } = useRestaurants();
  const { addRestaurantToTrip } = usePlaceRatings(tripId || undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter restaurants based on search query
  const filteredRestaurants = restaurants.filter(restaurant => 
    !restaurant.isWishlist && 
    restaurant.rating &&
    (restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
     restaurant.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddToTrip = async () => {
    if (!selectedRestaurant || !tripId) return;

    setIsLoading(true);
    try {
      await addRestaurantToTrip(tripId, selectedRestaurant);
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedRestaurant(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Restaurant to Trip
          </DialogTitle>
          <DialogDescription>
            Add restaurants you've rated to your trip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search your rated restaurants</Label>
            <Input
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, cuisine, or location..."
            />
          </div>

          {/* Restaurant List */}
          <div className="space-y-2">
            <Label>Your Rated Restaurants ({filteredRestaurants.length})</Label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRestaurants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No restaurants found matching your search' : 'No rated restaurants found'}
                </div>
              ) : (
                filteredRestaurants.map((restaurant) => (
                  <Card
                    key={restaurant.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedRestaurant?.id === restaurant.id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{restaurant.name}</h4>
                            {restaurant.michelinStars && restaurant.michelinStars > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {'⭐'.repeat(restaurant.michelinStars)} Michelin
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>{restaurant.cuisine}</span>
                            <span>•</span>
                            <span>{restaurant.address}</span>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{restaurant.rating}</span>
                            </div>
                            
                            {restaurant.priceRange && (
                              <div className="flex items-center gap-1">
                                <span>{'€'.repeat(restaurant.priceRange)}</span>
                              </div>
                            )}

                            {restaurant.dateVisited && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(restaurant.dateVisited).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {restaurant.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {restaurant.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {selectedRestaurant && (
            <div className="p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">Selected Restaurant</span>
              </div>
              <p className="text-sm">
                <strong>{selectedRestaurant.name}</strong> will be added to your trip with your existing rating and notes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddToTrip}
            disabled={isLoading || !selectedRestaurant || !tripId}
          >
            {isLoading ? 'Adding...' : 'Add to Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
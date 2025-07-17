import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { Restaurant } from '@/types/restaurant';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RestaurantCard } from '@/components/RestaurantCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapPageProps {
  restaurants: Restaurant[];
  onEditRestaurant: (id: string) => void;
}

export function MapPage({ restaurants, onEditRestaurant }: MapPageProps) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  
  const handleRestaurantSelect = (id: string) => {
    setSelectedRestaurantId(id);
  };
  
  // Find the selected restaurant
  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  
  // Filter restaurants that have coordinates
  const restaurantsWithCoords = restaurants.filter(
    restaurant => restaurant.latitude && restaurant.longitude
  );

  return (
    <div className="relative h-[calc(100vh-64px)]">
      <MapView 
        restaurants={restaurantsWithCoords} 
        onRestaurantSelect={handleRestaurantSelect} 
      />
      
      <Dialog 
        open={!!selectedRestaurant} 
        onOpenChange={(open) => !open && setSelectedRestaurantId(null)}
      >
        <DialogContent className="max-w-lg">
          <ScrollArea className="max-h-[80vh]">
            {selectedRestaurant && (
              <RestaurantCard 
                restaurant={selectedRestaurant}
                onEdit={onEditRestaurant}
              />
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
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
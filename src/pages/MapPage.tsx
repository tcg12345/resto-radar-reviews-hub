import { useState } from 'react';
import { MapView } from '@/components/MapView';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantDialog } from '@/components/Dialog/RestaurantDialog';
import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  // Find the restaurant for the map dialog
  const mapSelectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId);
  
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
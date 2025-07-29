import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RatedRestaurantsPage } from './RatedRestaurantsPage';
import { WishlistPage } from './WishlistPage';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';

interface SavedPlacesPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void;
  onEditRestaurant: (id: string, data: RestaurantFormData) => void;
  onDeleteRestaurant: (id: string) => void;
  shouldOpenAddDialog?: boolean;
  onAddDialogClose?: () => void;
  onNavigateToMap: () => void;
  onOpenSettings: () => void;
  activeSubTab?: 'rated' | 'wishlist';
}

export function SavedPlacesPage({
  restaurants,
  onAddRestaurant,
  onEditRestaurant,
  onDeleteRestaurant,
  shouldOpenAddDialog,
  onAddDialogClose,
  onNavigateToMap,
  onOpenSettings,
  activeSubTab = 'rated'
}: SavedPlacesPageProps) {
  const [currentTab, setCurrentTab] = useState(activeSubTab);

  return (
    <div className="w-full h-full">
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'rated' | 'wishlist')} className="w-full h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-4 lg:px-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="rated" className="text-sm font-medium">My Ratings</TabsTrigger>
            <TabsTrigger value="wishlist" className="text-sm font-medium">Wishlist</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="rated" className="mt-0 h-full">
          <RatedRestaurantsPage
            restaurants={restaurants}
            onAddRestaurant={onAddRestaurant}
            onEditRestaurant={onEditRestaurant}
            onDeleteRestaurant={onDeleteRestaurant}
            shouldOpenAddDialog={shouldOpenAddDialog}
            onAddDialogClose={onAddDialogClose}
            onNavigateToMap={onNavigateToMap}
            onOpenSettings={onOpenSettings}
          />
        </TabsContent>
        
        <TabsContent value="wishlist" className="mt-0 h-full">
          <WishlistPage
            restaurants={restaurants}
            onAddRestaurant={onAddRestaurant}
            onEditRestaurant={onEditRestaurant}
            onDeleteRestaurant={onDeleteRestaurant}
            onNavigateToMap={onNavigateToMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
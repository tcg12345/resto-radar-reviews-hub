import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RatedRestaurantsPage } from './RatedRestaurantsPage';
import { WishlistPage } from './WishlistPage';
import { RecommendationsPage } from './RecommendationsPage';
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
  activeSubTab?: 'rated' | 'wishlist' | 'recommendations';
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
      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as 'rated' | 'wishlist' | 'recommendations')} className="w-full h-full">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-4 lg:px-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg mx-auto">
            <TabsTrigger value="rated" className="text-sm font-medium">My Ratings</TabsTrigger>
            <TabsTrigger value="wishlist" className="text-sm font-medium">Wishlist</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-sm font-medium">Recs</TabsTrigger>
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
        
        <TabsContent value="recommendations" className="mt-0 h-full">
          <RecommendationsPage
            restaurants={restaurants}
            onAddRestaurant={onAddRestaurant}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RatedRestaurantsPageWrapper from '@/pages/RatedRestaurantsPageWrapper';
import WishlistPageWrapper from '@/pages/WishlistPageWrapper';

interface SavedPlacesPageProps {
  onNavigateToMap?: () => void;
  onOpenSettings?: () => void;
  shouldOpenAddDialog?: boolean;
  onAddDialogClose?: () => void;
}

export function SavedPlacesPage({ onNavigateToMap, onOpenSettings, shouldOpenAddDialog, onAddDialogClose }: SavedPlacesPageProps) {
  const [activeSubTab, setActiveSubTab] = useState('rated');

  // Switch to rated tab when add dialog should open
  useEffect(() => {
    if (shouldOpenAddDialog) {
      setActiveSubTab('rated');
    }
  }, [shouldOpenAddDialog]);

  return (
    <div className="h-full">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="h-full">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="px-4 py-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rated" className="text-sm">My Ratings</TabsTrigger>
              <TabsTrigger value="wishlist" className="text-sm">Wishlist</TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <TabsContent value="rated" className="mt-0 h-full">
          <RatedRestaurantsPageWrapper />
        </TabsContent>
        
        <TabsContent value="wishlist" className="mt-0 h-full">
          <WishlistPageWrapper />
        </TabsContent>
      </Tabs>
    </div>
  );
}
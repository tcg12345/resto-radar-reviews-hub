import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RatedRestaurantsPage } from '@/pages/RatedRestaurantsPage';
import { MapPage } from '@/pages/MapPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'rated' | 'wishlist' | 'map'>('rated');
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();

  const renderContent = () => {
    switch (activeTab) {
      case 'rated':
        return (
          <RatedRestaurantsPage
            restaurants={restaurants}
            onAddRestaurant={addRestaurant}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
          />
        );
      case 'wishlist':
        return (
          <WishlistPage
            restaurants={restaurants}
            onAddRestaurant={addRestaurant}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
          />
        );
      case 'map':
        return (
          <MapPage
            restaurants={restaurants}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}
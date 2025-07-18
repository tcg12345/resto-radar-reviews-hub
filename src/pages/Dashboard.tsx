import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { RatedRestaurantsPage } from '@/pages/RatedRestaurantsPage';
import { MapPage } from '@/pages/MapPage';
import { WishlistPage } from '@/pages/WishlistPage';
import HomePage from '@/pages/HomePage';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map'>('home');
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onNavigate={setActiveTab} />;
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
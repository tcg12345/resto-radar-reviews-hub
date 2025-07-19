import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { RatedRestaurantsPage } from '@/pages/RatedRestaurantsPage';
import { MapPage } from '@/pages/MapPage';
import { WishlistPage } from '@/pages/WishlistPage';
import HomePage from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import SettingsPage from '@/pages/SettingsPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { AIChatbot } from '@/components/AIChatbot';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();

  
  // Handle navigation state from other pages
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Handle navigation when search tab is clicked
  const handleTabChange = (tab: 'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends') => {
    if (tab === 'search') {
      navigate('/search');
    } else {
      setActiveTab(tab);
    }
  };

  const handleOpenAddRestaurant = () => {
    setShouldOpenAddDialog(true);
    setActiveTab('rated');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onNavigate={setActiveTab} onOpenAddRestaurant={handleOpenAddRestaurant} />;
      case 'rated':
        return (
          <RatedRestaurantsPage
            restaurants={restaurants}
            onAddRestaurant={addRestaurant}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
            shouldOpenAddDialog={shouldOpenAddDialog}
            onAddDialogClose={() => setShouldOpenAddDialog(false)}
            onNavigateToMap={() => setActiveTab('map')}
            onOpenSettings={() => setActiveTab('settings')}
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
      case 'settings':
        return <SettingsPage onBack={() => setActiveTab('home')} />;
      case 'friends':
        return <FriendsPage />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {activeTab !== 'settings' && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      )}
      
      <main className="flex-1">
        {renderContent()}
      </main>
      
      {activeTab !== 'settings' && activeTab !== 'map' && <AIChatbot />}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavbar } from '@/components/MobileNavbar';
import { MobileHeader } from '@/components/MobileHeader';
import { RatedRestaurantsPage } from '@/pages/RatedRestaurantsPage';
import { MapPage } from '@/pages/MapPage';
import { WishlistPage } from '@/pages/WishlistPage';
import HomePage from '@/pages/HomePage';
import UnifiedSearchPage from '@/pages/UnifiedSearchPage';
import SettingsPage from '@/pages/SettingsPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { AIChatbot } from '@/components/AIChatbot';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  
  // Handle navigation state from other pages
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

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
      case 'search':
        return <UnifiedSearchPage />;
      case 'settings':
        return <SettingsPage onBack={() => setActiveTab('home')} />;
      case 'friends':
        return <FriendsPage />;
    }
  };

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <MobileHeader 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onBack={activeTab === 'settings' ? () => setActiveTab('home') : undefined}
          showSettings={activeTab !== 'settings'}
        />
        
        <main className="flex-1 pb-16">
          {renderContent()}
        </main>
        
        {activeTab !== 'settings' && (
          <MobileNavbar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        )}
        
        {activeTab !== 'settings' && activeTab !== 'map' && <AIChatbot />}
      </div>
    );
  }

  // Desktop version - unchanged
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {activeTab !== 'settings' && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}
      
      <main className="flex-1">
        {renderContent()}
      </main>
      
      {activeTab !== 'settings' && activeTab !== 'map' && <AIChatbot />}
    </div>
  );
}

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
import { useIsMobileDevice } from '@/hooks/use-mobile-device';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobileDevice();

  console.log('Dashboard render - isMobile:', isMobile, 'screenWidth:', window.innerWidth);

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
    return (
      <div className="relative w-full h-full">
        <div className={`${activeTab === 'home' ? 'block' : 'hidden'}`}>
          <HomePage onNavigate={setActiveTab} onOpenAddRestaurant={handleOpenAddRestaurant} />
        </div>
        <div className={`${activeTab === 'rated' ? 'block' : 'hidden'}`}>
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
        </div>
        <div className={`${activeTab === 'wishlist' ? 'block' : 'hidden'}`}>
          <WishlistPage
            restaurants={restaurants}
            onAddRestaurant={addRestaurant}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
          />
        </div>
        <div className={`${activeTab === 'map' ? 'block' : 'hidden'}`}>
          <MapPage
            restaurants={restaurants}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
          />
        </div>
        <div className={`${activeTab === 'search' ? 'block' : 'hidden'}`}>
          <UnifiedSearchPage />
        </div>
        <div className={`${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <SettingsPage onBack={() => setActiveTab('home')} />
        </div>
        <div className={`${activeTab === 'friends' ? 'block' : 'hidden'}`}>
          <FriendsPage />
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background mobile-container no-horizontal-scroll">
        <MobileHeader 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onBack={activeTab === 'settings' ? () => setActiveTab('home') : undefined}
          showSettings={activeTab !== 'settings'}
        />
        
        <main className="flex-1 pb-16 mobile-container">
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

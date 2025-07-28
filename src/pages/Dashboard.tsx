// Dashboard component - cleaned up searchSubTab references
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { RatedRestaurantsPage } from '@/pages/RatedRestaurantsPage';
import { MapPage } from '@/pages/MapPage';
import { WishlistPage } from '@/pages/WishlistPage';
import HomePage from '@/pages/HomePage';
import UnifiedSearchPage from '@/pages/UnifiedSearchPage';
import SettingsPage from '@/pages/SettingsPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { MobileFeedPage } from '@/pages/mobile/MobileFeedPage';
import { DesktopFeedPage } from '@/pages/DesktopFeedPage';
import { AIChatbot } from '@/components/AIChatbot';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'feed' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const [viewFriendId, setViewFriendId] = useState<string | null>(null);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state from other pages
  useEffect(() => {
    console.log('useEffect triggered with location.state:', location.state);
    if (location.state?.activeTab) {
      console.log('Setting activeTab from location.state:', location.state.activeTab);
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.viewFriendId) {
      setViewFriendId(location.state.viewFriendId);
    }
    // Clear navigation state after using it
    if (location.state) {
      console.log('Clearing location.state');
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const handleOpenAddRestaurant = () => {
    setShouldOpenAddDialog(true);
    setActiveTab('rated');
  };

  const handleTabChange = (tab: 'home' | 'feed' | 'rated' | 'wishlist' | 'search' | 'settings' | 'friends' | 'travel') => {
    setActiveTab(tab);
  };


  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage onNavigate={setActiveTab} onOpenAddRestaurant={handleOpenAddRestaurant} />;
      case 'feed':
        return (
          <>
            <div className="lg:hidden">
              <MobileFeedPage />
            </div>
            <div className="hidden lg:block">
              <DesktopFeedPage />
            </div>
          </>
        );
      case 'rated':
        return (
          <RatedRestaurantsPage
            restaurants={restaurants}
            onAddRestaurant={addRestaurant}
            onEditRestaurant={updateRestaurant}
            onDeleteRestaurant={deleteRestaurant}
            shouldOpenAddDialog={shouldOpenAddDialog}
            onAddDialogClose={() => setShouldOpenAddDialog(false)}
            onNavigateToMap={() => navigate('/map')}
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
            onNavigateToMap={() => navigate('/map')}
          />
        );
      case 'search':
        return <UnifiedSearchPage />;
      case 'settings':
        return <SettingsPage onBack={() => setActiveTab('home')} />;
      case 'friends':
        return (
          <FriendsPage 
            initialViewFriendId={viewFriendId} 
            onInitialViewProcessed={() => setViewFriendId(null)}
          />
        );
      default:
        console.log('DASHBOARD: Rendering DEFAULT (home) content');
        return <HomePage onNavigate={setActiveTab} onOpenAddRestaurant={handleOpenAddRestaurant} />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background mobile-viewport">
      {activeTab !== 'settings' && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      )}
      
      <main className="flex-1 pb-12 lg:pb-0 mobile-scroll">
        <div className="min-h-full mobile-container">
          {renderContent()}
        </div>
      </main>
      
      {activeTab !== 'settings' && <AIChatbot />}
    </div>
  );
}

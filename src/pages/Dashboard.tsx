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
import { AIChatbot } from '@/components/AIChatbot';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map' | 'search' | 'settings' | 'friends'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const [viewFriendId, setViewFriendId] = useState<string | null>(null);
  const [searchSubTab, setSearchSubTab] = useState<string | null>(null);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle navigation state from other pages
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.viewFriendId) {
      setViewFriendId(location.state.viewFriendId);
    }
    if (location.state?.searchSubTab) {
      setSearchSubTab(location.state.searchSubTab);
    }
    // Clear navigation state after using it
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

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
          <UnifiedSearchPage 
            initialSubTab={searchSubTab} 
            onSubTabProcessed={() => setSearchSubTab(null)}
          />
        </div>
        <div className={`${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <SettingsPage onBack={() => setActiveTab('home')} />
        </div>
        <div className={`${activeTab === 'friends' ? 'block' : 'hidden'}`}>
          <FriendsPage 
            initialViewFriendId={viewFriendId} 
            onInitialViewProcessed={() => setViewFriendId(null)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background mobile-viewport">
      {activeTab !== 'settings' && (
        <Navbar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
      )}
      
      <main className="flex-1 pb-16 lg:pb-0 mobile-scroll">`
        <div className="min-h-full mobile-container">
          {renderContent()}
        </div>
      </main>
      
      {activeTab !== 'settings' && activeTab !== 'map' && <AIChatbot />}
    </div>
  );
}

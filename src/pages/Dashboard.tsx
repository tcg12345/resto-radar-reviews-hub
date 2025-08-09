// Dashboard component - cleaned up searchSubTab references
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import SavedPlacesPageWrapper from '@/pages/SavedPlacesPageWrapper';
import HomePage from '@/pages/HomePage';
import UnifiedSearchPage from '@/pages/UnifiedSearchPage';
import SettingsPage from '@/pages/SettingsPage';
import { FriendsPage } from '@/pages/FriendsPage';
import { MobileProfilePage } from '@/components/mobile/MobileProfilePage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AIChatbot } from '@/components/AIChatbot';
import { useRestaurants } from '@/contexts/RestaurantContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'places' | 'search' | 'settings' | 'profile' | 'travel' | 'friends'>('home');
  const [shouldOpenAddDialog, setShouldOpenAddDialog] = useState(false);
  const [viewFriendId, setViewFriendId] = useState<string | null>(null);
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Handle navigation state from other pages
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.viewFriendId) {
      setViewFriendId(location.state.viewFriendId);
    }
    // Clear navigation state after using it
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const handleOpenAddRestaurant = () => {
    setShouldOpenAddDialog(true);
    setActiveTab('places');
  };

  const renderContent = () => {
    return (
      <div className="relative w-full h-full">
        <div className={`${activeTab === 'home' ? 'block' : 'hidden'}`}>
          <HomePage onNavigate={setActiveTab} onOpenAddRestaurant={handleOpenAddRestaurant} />
        </div>
        <div className={`${activeTab === 'places' ? 'block' : 'hidden'}`}>
          <SavedPlacesPageWrapper
            shouldOpenAddDialog={shouldOpenAddDialog}
            onAddDialogClose={() => setShouldOpenAddDialog(false)}
            activeSubTab="rated"
          />
        </div>
        <div className={`${activeTab === 'search' ? 'block' : 'hidden'}`}>
          <UnifiedSearchPage />
        </div>
        <div className={`${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <SettingsPage onBack={() => setActiveTab('home')} />
        </div>
        <div className={`${activeTab === 'profile' ? 'block' : 'hidden'}`}>
          {(() => {
            console.log('Dashboard render - isMobile:', isMobile, 'activeTab:', activeTab);
            return isMobile ? (
              <MobileProfilePage />
            ) : (
              <FriendsPage 
                initialViewFriendId={viewFriendId} 
                onInitialViewProcessed={() => setViewFriendId(null)}
              />
            );
          })()}
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
      
      <main className="flex-1 pb-12 lg:pb-0 mobile-scroll">
        <div className="min-h-full mobile-container">
          {renderContent()}
        </div>
      </main>
      
      {activeTab !== 'settings' && <AIChatbot />}
    </div>
  );
}

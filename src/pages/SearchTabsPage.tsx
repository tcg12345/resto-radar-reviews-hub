import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
const UnifiedSearchPage = lazy(() => import('./UnifiedSearchPage'));
const FriendsActivityPage = lazy(() => import('./FriendsActivityPage').then(m => ({ default: m.FriendsActivityPage })));
const ExpertSearchPage = lazy(() => import('../components/mobile/MobileExpertSearchPage').then(m => ({ default: m.MobileExpertSearchPage })));

type SearchTab = 'global' | 'friends' | 'experts';

export default function SearchTabsPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [activeTab, setActiveTab] = useState<SearchTab>('global');

  useEffect(() => {
    if (tab) {
      setActiveTab(tab as SearchTab);
    } else if (window.location.pathname === '/friends-activity') {
      // If accessed via legacy route, show friends tab
      setActiveTab('friends');
    }
  }, [tab]);

  const handleTabChange = (value: string) => {
    const newTab = value as SearchTab;
    setActiveTab(newTab);
    
    // Handle routing for the friends tab specifically to maintain backwards compatibility
    if (newTab === 'friends') {
      // Check if this is accessed via the legacy /friends-activity route
      if (window.location.pathname === '/friends-activity') {
        // Don't navigate, just update state to show friends content
        return;
      }
    }
    
    navigate(`/search/${newTab}`);
  };

  return (
    <div className="w-full mobile-container py-3">
      <div className="mb-4 hidden">
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Mobile Tab Buttons */}
        <div className="flex mb-4 bg-muted/30 rounded-xl p-1">
          <button
            onClick={() => handleTabChange('global')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'global'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Restaurants
          </button>
          <button
            onClick={() => handleTabChange('friends')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Friends
          </button>
          <button
            onClick={() => handleTabChange('experts')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'experts'
                ? 'bg-white text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Experts
          </button>
        </div>

        {activeTab === 'global' && (
          <TabsContent value="global" className="mt-0">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
              <UnifiedSearchPage />
            </Suspense>
          </TabsContent>
        )}

        {activeTab === 'friends' && (
          <TabsContent value="friends" className="mt-0">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
              <FriendsActivityPage />
            </Suspense>
          </TabsContent>
        )}

        {activeTab === 'experts' && (
          <TabsContent value="experts" className="mt-0">
            <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
              <ExpertSearchPage />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
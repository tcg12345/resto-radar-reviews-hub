import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import UnifiedSearchPage from './UnifiedSearchPage';
import { DiscoverPage } from './DiscoverPage';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { FriendsActivityPage } from './FriendsActivityPage';

type SearchTab = 'global' | 'smart' | 'recommendations' | 'friends';

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
    <>
      {/* Mobile Version - Simplified */}
      <div className="lg:hidden w-full mobile-container py-3">
        <div className="mb-4 hidden">
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Mobile Tab Buttons */}
          <div className="flex mb-4 bg-muted/30 rounded-xl p-1">
            <button
              onClick={() => handleTabChange('global')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'global'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Restaurants
            </button>
            <button
              onClick={() => handleTabChange('friends')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'friends'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Friends
            </button>
          </div>

          <TabsContent value="global" className="mt-0">
            <UnifiedSearchPage />
          </TabsContent>

          <TabsContent value="friends" className="mt-0">
            <FriendsActivityPage />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop Version - Full Tabs */}
      <div className="hidden lg:block w-full p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Search & Discover Restaurants
          </h1>
          <p className="text-muted-foreground text-lg">
            Find restaurants worldwide with multiple search methods and personalized recommendations
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 gap-0 h-10 p-1">
            <TabsTrigger value="global" className="text-sm px-3 py-1.5">Search</TabsTrigger>
            <TabsTrigger value="smart" className="text-sm px-3 py-1.5">Discovery</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-sm px-3 py-1.5">Recommendations</TabsTrigger>
            <TabsTrigger value="friends" className="text-sm px-3 py-1.5">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            <UnifiedSearchPage />
          </TabsContent>

          <TabsContent value="smart" className="space-y-6">
            <DiscoverPage />
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6">
            <PersonalizedRecommendations />
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            <FriendsActivityPage />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
const UnifiedSearchPage = lazy(() => import('./UnifiedSearchPage'));
const DiscoverPage = lazy(() => import('./DiscoverPage').then(m => ({ default: m.DiscoverPage })));
const FriendsActivityPage = lazy(() => import('./FriendsActivityPage').then(m => ({ default: m.FriendsActivityPage })));
const ExpertSearchPage = lazy(() => import('../components/mobile/MobileExpertSearchPage').then(m => ({ default: m.MobileExpertSearchPage })));

type SearchTab = 'global' | 'smart' | 'recommendations' | 'friends' | 'experts';

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
      <div className="lg:hidden w-full mobile-container py-4">
        <div className="mb-6 hidden">
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* Modern Tab Pills - No Horizontal Scrolling */}
          <div className="flex mb-6 bg-muted/20 rounded-2xl p-1.5 border">
            <button
              onClick={() => handleTabChange('global')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'global'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Restaurants
            </button>
            <button
              onClick={() => handleTabChange('friends')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'friends'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => handleTabChange('experts')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === 'experts'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
            <TabsTrigger value="global" className="text-sm px-2 py-1.5">Search</TabsTrigger>
            <TabsTrigger value="smart" className="text-sm px-2 py-1.5">Discovery</TabsTrigger>
            <TabsTrigger value="friends" className="text-sm px-2 py-1.5">Friends</TabsTrigger>
            <TabsTrigger value="experts" className="text-sm px-2 py-1.5">Experts</TabsTrigger>
          </TabsList>

{activeTab === 'global' && (
  <TabsContent value="global" className="space-y-6">
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading search...</div>}>
      <UnifiedSearchPage />
    </Suspense>
  </TabsContent>
)}

{activeTab === 'smart' && (
  <TabsContent value="smart" className="space-y-6">
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading discovery...</div>}>
      <DiscoverPage />
    </Suspense>
  </TabsContent>
)}

{activeTab === 'friends' && (
  <TabsContent value="friends" className="space-y-6">
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading friends...</div>}>
      <FriendsActivityPage />
    </Suspense>
  </TabsContent>
)}

{activeTab === 'experts' && (
  <TabsContent value="experts" className="space-y-6">
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading experts...</div>}>
      <ExpertSearchPage />
    </Suspense>
  </TabsContent>
)}
        </Tabs>
      </div>
    </>
  );
}
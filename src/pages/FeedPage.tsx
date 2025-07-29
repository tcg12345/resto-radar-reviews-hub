import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter, Plus, Search, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useFriends } from '@/hooks/useFriends';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
import { FriendActivityCard } from '@/components/feed/FriendActivityCard';
import { TrendingSection } from '@/components/feed/TrendingSection';
import { AIPersonalizedPicks } from '@/components/feed/AIPersonalizedPicks';
import { NewlyOpenedSection } from '@/components/feed/NewlyOpenedSection';
import { RestaurantOfTheDay } from '@/components/feed/RestaurantOfTheDay';
import { QuickReactionsSection } from '@/components/feed/QuickReactionsSection';

interface FeedPageProps {
  onNavigate: (tab: 'rated' | 'wishlist' | 'search' | 'friends') => void;
  onOpenAddRestaurant: () => void;
}

// Mock data - in a real app, this would come from APIs
const mockFriendActivities = [
  {
    id: '1',
    friend: {
      id: 'friend1',
      username: 'foodie_alex',
      name: 'Alex Chen',
      avatar_url: '/lovable-uploads/11b9bd4d-7516-4300-afc4-5916a04a932f.png'
    },
    restaurant: {
      id: 'rest1',
      name: 'Nobu Downtown',
      cuisine: 'Japanese',
      address: '195 Broadway',
      city: 'New York',
      rating: 4.8,
      photos: ['/lovable-uploads/36b2db2e-b9a4-4f96-bf7f-75386a541657.png'],
      price_range: 4,
      michelin_stars: 1
    },
    activity: {
      type: 'rating' as const,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      rating: 4.8,
      review: 'Absolutely incredible omakase experience! The black cod was perfection.'
    }
  },
  {
    id: '2',
    friend: {
      id: 'friend2',
      username: 'pasta_lover',
      name: 'Maria Santos',
      avatar_url: '/lovable-uploads/42e9db1d-cc84-4c54-9adb-50dc08b98369.png'
    },
    restaurant: {
      id: 'rest2',
      name: 'Don Angie',
      cuisine: 'Italian-American',
      address: '103 Greenwich Ave',
      city: 'New York',
      rating: 4.6,
      photos: ['/lovable-uploads/4184d3a1-346a-454b-ad4f-5db720774949.png'],
      price_range: 3
    },
    activity: {
      type: 'wishlist' as const,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    }
  }
];

const mockTrendingRestaurants = [
  {
    id: 'trend1',
    name: 'Casa Cipriani',
    cuisine: 'Italian',
    city: 'New York',
    rating: 4.7,
    photos: ['/lovable-uploads/72105a14-071b-4a8c-a0c5-981aa2ca4064.png'],
    trending_score: 25,
    price_range: 4
  },
  {
    id: 'trend2',
    name: 'Atomix',
    cuisine: 'Korean',
    city: 'New York',
    rating: 4.9,
    photos: ['/lovable-uploads/7f2af544-2da2-4215-9cdf-78845079ddea.png'],
    trending_score: 18,
    price_range: 4
  },
  {
    id: 'trend3',
    name: 'Prince Street Pizza',
    cuisine: 'Italian',
    city: 'New York',
    rating: 4.4,
    photos: ['/lovable-uploads/a19328d3-fb1d-41e4-b595-caaee16a8c16.png'],
    trending_score: 15,
    price_range: 1
  }
];

const mockPersonalizedPicks = [
  {
    id: 'ai1',
    name: 'Sushi Nakazawa',
    cuisine: 'Japanese',
    city: 'New York',
    rating: 4.8,
    photos: ['/lovable-uploads/ae2b0f9b-0084-4b18-97d0-fcf000255bd3.png'],
    match_score: 95,
    reason: 'Based on your love for omakase and high-end sushi experiences',
    price_range: 4,
    distance: '0.8 mi'
  },
  {
    id: 'ai2',
    name: 'Via Carota',
    cuisine: 'Italian',
    city: 'New York',
    rating: 4.5,
    photos: ['/lovable-uploads/c58d19e3-6527-466e-bc23-7de1acec9f44.png'],
    match_score: 88,
    reason: 'Perfect for intimate dinners, matches your preference for cozy atmospheres',
    price_range: 3,
    distance: '1.2 mi'
  },
  {
    id: 'ai3',
    name: 'Katz\'s Delicatessen',
    cuisine: 'American',
    city: 'New York',
    rating: 4.3,
    photos: ['/lovable-uploads/d3e2619d-3039-47d4-ae30-f20881868a4f.png'],
    match_score: 82,
    reason: 'An iconic NYC experience that aligns with your adventurous food spirit',
    price_range: 2,
    distance: '2.1 mi'
  }
];

const mockNewlyOpened = [
  {
    id: 'new1',
    name: 'Odo',
    cuisine: 'Japanese',
    city: 'New York',
    address: '17 Ave B',
    photos: ['/lovable-uploads/11b9bd4d-7516-4300-afc4-5916a04a932f.png'],
    opening_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    price_range: 4
  },
  {
    id: 'new2',
    name: 'Saga',
    cuisine: 'American',
    city: 'New York',
    address: '70 Pine St',
    photos: ['/lovable-uploads/36b2db2e-b9a4-4f96-bf7f-75386a541657.png'],
    opening_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    price_range: 4
  }
];

const mockRestaurantOfTheDay = {
  id: 'rotd1',
  name: 'Le Bernardin',
  cuisine: 'French Seafood',
  city: 'New York',
  address: '155 W 51st St',
  rating: 4.9,
  photos: ['/lovable-uploads/42e9db1d-cc84-4c54-9adb-50dc08b98369.png'],
  description: 'Exquisite French seafood restaurant helmed by Chef Eric Ripert. A temple to the sea with unparalleled technique and artistry in every dish.',
  price_range: 4,
  michelin_stars: 3,
  featured_reason: 'Celebrating 35 years of culinary excellence with a special anniversary tasting menu'
};

export function FeedPage({ onNavigate, onOpenAddRestaurant }: FeedPageProps) {
  const { user, profile } = useAuth();
  const { restaurants } = useRestaurants();
  const { friends } = useFriends();
  
  const [activities, setActivities] = useState(mockFriendActivities);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'friends' | 'trending' | 'personal'>('all');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const userLocation = 'New York'; // In real app, get from user's location

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    setPage(1);
    setHasMore(true);
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    setIsLoading(true);
    // Simulate loading more activities
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app, fetch more data
    if (page >= 3) {
      setHasMore(false);
    } else {
      setPage(prev => prev + 1);
    }
    setIsLoading(false);
  }, [hasMore, isLoading, page]);

  const handleRestaurantClick = useCallback((restaurantId: string) => {
    console.log('Navigate to restaurant:', restaurantId);
    // In real app, navigate to restaurant details
  }, []);

  const handleFriendClick = useCallback((friendId: string) => {
    console.log('Navigate to friend:', friendId);
    onNavigate('friends');
  }, [onNavigate]);

  const handleAddToWishlist = useCallback((restaurantId: string) => {
    console.log('Add to wishlist:', restaurantId);
    // In real app, add to wishlist
  }, []);

  const handleShare = useCallback((restaurantId: string) => {
    console.log('Share restaurant:', restaurantId);
    // In real app, open share dialog
  }, []);

  const handleReactionClick = useCallback((reactionId: string) => {
    console.log('Reaction clicked:', reactionId);
    // In real app, track reaction
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-white font-bold text-sm">🍽️</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 w-9 p-0 rounded-full"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={onOpenAddRestaurant}
              className="h-9 w-9 p-0 rounded-full bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'All', icon: '📱' },
            { id: 'friends', label: 'Friends', icon: '👥' },
            { id: 'trending', label: 'Trending', icon: '🔥' },
            { id: 'personal', label: 'For You', icon: '✨' }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={filter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.id as any)}
              className={`h-8 whitespace-nowrap transition-all duration-200 ${
                filter === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground border-border/50'
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-background border-b border-border/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍽️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Food Feed</h1>
              <p className="text-muted-foreground">Discover, explore, and connect through food</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="default" onClick={onOpenAddRestaurant} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Restaurant
            </Button>
          </div>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Restaurant of the Day */}
        <RestaurantOfTheDay
          restaurant={mockRestaurantOfTheDay}
          onRestaurantClick={handleRestaurantClick}
          onAddToWishlist={handleAddToWishlist}
          onShare={handleShare}
        />

        {/* Quick Actions Row */}
        <div className="grid md:grid-cols-2 gap-6">
          <QuickReactionsSection
            reactions={[]}
            onReactionClick={handleReactionClick}
          />
          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-16 gap-3 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5"
              onClick={() => onNavigate('search')}
            >
              <Search className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Discover Restaurants</div>
                <div className="text-xs text-muted-foreground">Find your next favorite spot</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-16 gap-3 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5"
              onClick={() => onNavigate('friends')}
            >
              <MapPin className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Explore Near You</div>
                <div className="text-xs text-muted-foreground">See what's popular nearby</div>
              </div>
            </Button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid gap-6">
          {/* AI Personalized Picks */}
          <AIPersonalizedPicks
            restaurants={mockPersonalizedPicks}
            onRestaurantClick={handleRestaurantClick}
            onViewAll={() => onNavigate('search')}
          />

          {/* Trending Section */}
          <TrendingSection
            location={userLocation}
            restaurants={mockTrendingRestaurants}
            onRestaurantClick={handleRestaurantClick}
            onViewAll={() => onNavigate('search')}
          />

          {/* Newly Opened */}
          <NewlyOpenedSection
            restaurants={mockNewlyOpened}
            onRestaurantClick={handleRestaurantClick}
            onAddToWishlist={handleAddToWishlist}
            onViewAll={() => onNavigate('search')}
          />

          {/* Friend Activities */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Friend Activity</h2>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('friends')}>
                View All
              </Button>
            </div>
            
            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <FriendActivityCard
                    key={activity.id}
                    friend={activity.friend}
                    restaurant={activity.restaurant}
                    activity={activity.activity}
                    onRestaurantClick={handleRestaurantClick}
                    onFriendClick={handleFriendClick}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  👥
                </div>
                <h3 className="font-semibold mb-2">No friend activity yet</h3>
                <p className="text-sm mb-4">Connect with friends to see their restaurant discoveries</p>
                <Button variant="outline" onClick={() => onNavigate('friends')}>
                  Find Friends
                </Button>
              </div>
            )}
          </div>

          {/* Infinite Scroll Loader */}
          {hasMore && (
            <InfiniteScrollLoader 
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Bottom Spacer for Mobile */}
        <div className="h-20 md:h-0" />
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  Users,
  Sparkles,
  TrendingUp,
  Award,
  RefreshCw,
  Filter,
  Plus,
  Search,
  Heart,
  MessageSquare,
  UserPlus,
  Trophy,
  Zap,
  Clock,
  Flame,
  Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { SwipeableRecommendations } from '@/components/feed/SwipeableRecommendations';
import { FriendActivityCard } from '@/components/feed/FriendActivityCard';
import { FeedSection } from '@/components/feed/FeedSection';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
import { formatDistanceToNow } from 'date-fns';

interface FeedPageProps {
  onNavigate: (tab: 'home' | 'rated' | 'wishlist' | 'search' | 'friends') => void;
  onOpenAddRestaurant: () => void;
}

interface FeedActivity {
  id: string;
  type: 'friend_rating' | 'friend_wishlist' | 'personal_rating' | 'milestone' | 'trending_cuisine' | 'recommendation';
  timestamp: Date;
  data: any;
}

export function FeedPage({ onNavigate, onOpenAddRestaurant }: FeedPageProps) {
  const { user, profile } = useAuth();
  const { restaurants } = useRestaurants();
  const { friends } = useFriends();
  const { fetchAllFriendsRestaurants } = useFriendRestaurants();
  
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'friends' | 'personal'>('all');

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating);
  const wishlistRestaurants = restaurants.filter(r => r.isWishlist);

  // Load initial feed data
  useEffect(() => {
    if (user) {
      loadFeedData(true);
    }
  }, [user]);

  const loadFeedData = async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        setPage(0);
        setActivities([]);
      }

      // Load friend activities
      const { activities: friendActivities, hasMore: friendsHasMore } = await fetchAllFriendsRestaurants(refresh ? 0 : page, 20);
      
      // Generate personal activities from user's recent restaurants
      const personalActivities: FeedActivity[] = [];
      
      // Add recent ratings
      const recentRatings = [...ratedRestaurants]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(restaurant => ({
          id: `personal-rating-${restaurant.id}`,
          type: 'personal_rating' as const,
          timestamp: new Date(restaurant.updatedAt),
          data: {
            restaurant,
            user: profile
          }
        }));

      personalActivities.push(...recentRatings);

      // Add milestone achievements
      if (ratedRestaurants.length === 10 || ratedRestaurants.length === 25 || ratedRestaurants.length === 50 || ratedRestaurants.length === 100) {
        personalActivities.push({
          id: `milestone-${ratedRestaurants.length}`,
          type: 'milestone',
          timestamp: new Date(),
          data: {
            type: 'restaurants_milestone',
            count: ratedRestaurants.length,
            title: getMilestoneTitle(ratedRestaurants.length),
            description: getMilestoneDescription(ratedRestaurants.length)
          }
        });
      }

      // Add trending cuisine info
      const cuisineStats = ratedRestaurants.reduce((acc, r) => {
        acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCuisine = Object.entries(cuisineStats)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCuisine && topCuisine[1] >= 3) {
        personalActivities.push({
          id: 'trending-cuisine',
          type: 'trending_cuisine',
          timestamp: new Date(),
          data: {
            cuisine: topCuisine[0],
            count: topCuisine[1],
            restaurants: ratedRestaurants.filter(r => r.cuisine === topCuisine[0]).slice(0, 3)
          }
        });
      }

      // Convert friend activities to our format
      const formattedFriendActivities: FeedActivity[] = friendActivities.map(activity => ({
        id: `friend-${activity.id}-${activity.userId}`,
        type: 'friend_rating' as const,
        timestamp: new Date(activity.updatedAt),
        data: {
          friend: {
            id: activity.userId,
            username: activity.friend_username,
            name: activity.friend_username,
            avatar_url: null
          },
          restaurant: {
            id: activity.id,
            name: activity.name,
            cuisine: activity.cuisine,
            rating: activity.rating,
            photos: activity.photos || [],
            address: activity.address || '',
            city: activity.city || '',
            notes: activity.notes
          }
        }
      }));

      // Combine and sort all activities
      const allActivities = [...personalActivities, ...formattedFriendActivities]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (refresh) {
        setActivities(allActivities);
      } else {
        setActivities(prev => [...prev, ...allActivities]);
      }

      setHasMore(friendsHasMore);
      setPage(prev => prev + 1);

    } catch (error) {
      console.error('Error loading feed data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getMilestoneTitle = (count: number) => {
    switch (count) {
      case 10: return '🎉 First 10 Restaurants!';
      case 25: return '🍴 Getting Serious!';
      case 50: return '🏆 Food Explorer!';
      case 100: return '👑 Foodie Legend!';
      default: return `🎯 ${count} Restaurants!`;
    }
  };

  const getMilestoneDescription = (count: number) => {
    switch (count) {
      case 10: return 'You\'ve rated your first 10 restaurants. Keep exploring!';
      case 25: return 'Quarter-century of dining experiences!';
      case 50: return 'Wow! You\'re becoming a true food connoisseur!';
      case 100: return 'Incredible! You\'ve explored 100 restaurants!';
      default: return `Amazing milestone! ${count} restaurants rated.`;
    }
  };

  const loadMoreActivities = useCallback(() => {
    if (!isLoading && hasMore) {
      loadFeedData(false);
    }
  }, [isLoading, hasMore, page]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadFeedData(true);
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'personal') return activity.type === 'personal_rating' || activity.type === 'milestone' || activity.type === 'trending_cuisine';
    if (filter === 'friends') return activity.type === 'friend_rating' || activity.type === 'friend_wishlist';
    return true;
  });

  const renderActivity = (activity: FeedActivity) => {
    switch (activity.type) {
      case 'friend_rating':
        return (
          <FriendActivityCard
            key={activity.id}
            activity={{
              id: activity.id,
              friend: activity.data.friend,
              restaurant: activity.data.restaurant,
              timestamp: activity.timestamp,
              type: 'rating'
            }}
            onLike={() => {/* TODO: Implement like functionality */}}
            onComment={() => {/* TODO: Implement comment functionality */}}
            onShare={() => {/* TODO: Implement share functionality */}}
            onViewRestaurant={() => {/* TODO: Implement view restaurant functionality */}}
          />
        );

      case 'personal_rating':
        const { restaurant, user } = activity.data;
        return (
          <Card key={activity.id} className="bg-card border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.[0] || user?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">You</span>
                    <span className="text-muted-foreground text-sm">rated a restaurant</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">{restaurant.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {restaurant.cuisine} • {restaurant.city}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-xs text-yellow-700 dark:text-yellow-300">
                          {restaurant.rating}
                        </span>
                      </div>
                      {restaurant.priceRange && (
                        <Badge variant="outline" className="text-xs">
                          {'$'.repeat(restaurant.priceRange)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'milestone':
        const { title, description } = activity.data;
        return (
          <Card key={activity.id} className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Achievement Unlocked
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>
        );

      case 'trending_cuisine':
        const { cuisine, count, restaurants: trendingRestaurants } = activity.data;
        return (
          <Card key={activity.id} className="bg-card border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Your {cuisine} Journey</h3>
                  <p className="text-sm text-muted-foreground">
                    You've explored {count} {cuisine.toLowerCase()} restaurants
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                {trendingRestaurants.slice(0, 2).map((restaurant: any) => (
                  <div key={restaurant.id} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{restaurant.name}</span>
                    <div className="flex items-center space-x-1 ml-auto">
                      <span className="text-xs">{restaurant.rating}⭐</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('rated')}>
                Explore More {cuisine}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-foreground">Feed</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 px-4 pb-3">
          {[
            { id: 'all', label: 'All' },
            { id: 'personal', label: 'Personal' },
            { id: 'recommendations', label: 'AI' },
            { id: 'friends', label: 'Friends' }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={filter === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter(tab.id as any)}
              className={`h-8 text-xs transition-all duration-200 ${
                filter === tab.id 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Your Feed</h1>
                <p className="text-muted-foreground">Discover restaurants, friends, and recommendations</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'personal', label: 'Personal' },
                  { id: 'recommendations', label: 'AI' },
                  { id: 'friends', label: 'Friends' }
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={filter === tab.id ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setFilter(tab.id as any)}
                    className={`transition-all duration-200 ${
                      filter === tab.id 
                        ? 'bg-primary text-primary-foreground shadow-sm' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4 pb-20 md:pb-4">
        {/* Quick Actions - Mobile Only */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-6">
          <Button
            variant="outline"
            className="h-14 flex-col space-y-1 border-primary/20 hover:bg-primary/5"
            onClick={onOpenAddRestaurant}
          >
            <Plus className="h-5 w-5 text-primary" />
            <span className="text-xs">Add Restaurant</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 flex-col space-y-1 border-primary/20 hover:bg-primary/5"
            onClick={() => onNavigate('search')}
          >
            <Search className="h-5 w-5 text-primary" />
            <span className="text-xs">Discover</span>
          </Button>
        </div>

        {/* Feed Items */}
        <div className="space-y-4">
          {filteredActivities.length > 0 ? (
            filteredActivities.map(renderActivity)
          ) : (
            <Card className="bg-card border border-border shadow-sm">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Your feed is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Start rating restaurants and connecting with friends to see activity here!
                </p>
                <div className="flex justify-center space-x-3">
                  <Button onClick={onOpenAddRestaurant}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Restaurant
                  </Button>
                  <Button variant="outline" onClick={() => onNavigate('friends')}>
                    <Users className="h-4 w-4 mr-2" />
                    Find Friends
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Load More - Desktop */}
        {filteredActivities.length > 0 && (
          <div className="hidden md:flex justify-center pt-4">
            <Button variant="outline" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              All caught up!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
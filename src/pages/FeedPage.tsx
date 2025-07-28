import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Star, 
  MapPin, 
  Heart, 
  Plus, 
  TrendingUp, 
  Award, 
  ChefHat,
  Clock,
  Users,
  Bot,
  Search,
  Zap,
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Utensils,
  Camera,
  Globe2,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useFriends } from '@/hooks/useFriends';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';
import { LazyImage } from '@/components/LazyImage';

interface FeedPageProps {
  onNavigate: (tab: 'rated' | 'wishlist' | 'search' | 'friends') => void;
  onOpenAddRestaurant: () => void;
}

interface FeedItem {
  id: string;
  type: 'restaurant_rating' | 'friend_activity' | 'recommendation' | 'milestone' | 'trending';
  timestamp: Date;
  content: any;
  priority: number;
}

export function FeedPage({ onNavigate, onOpenAddRestaurant }: FeedPageProps) {
  const { user, profile } = useAuth();
  const { restaurants } = useRestaurants();
  const { friends } = useFriends();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'friends' | 'recommendations' | 'personal'>('all');

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating);
  const recentRestaurants = [...ratedRestaurants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Generate feed items
  useEffect(() => {
    const generateFeedItems = () => {
      const items: FeedItem[] = [];

      // Recent restaurant ratings
      recentRestaurants.forEach((restaurant, index) => {
        items.push({
          id: `rating-${restaurant.id}`,
          type: 'restaurant_rating',
          timestamp: new Date(restaurant.updatedAt),
          content: {
            restaurant,
            user: profile,
            isOwn: true
          },
          priority: 8 - index
        });
      });

      // Milestone achievements
      if (ratedRestaurants.length === 10) {
        items.push({
          id: 'milestone-10',
          type: 'milestone',
          timestamp: new Date(),
          content: {
            type: 'restaurants_milestone',
            count: 10,
            title: '🎉 First 10 Restaurants!',
            description: 'You\'ve rated your first 10 restaurants. Keep exploring!'
          },
          priority: 9
        });
      }

      if (ratedRestaurants.length === 50) {
        items.push({
          id: 'milestone-50',
          type: 'milestone',
          timestamp: new Date(),
          content: {
            type: 'restaurants_milestone',
            count: 50,
            title: '🏆 Food Explorer!',
            description: 'Wow! 50 restaurants rated. You\'re a true food explorer!'
          },
          priority: 9
        });
      }

      // Trending topics
      const cuisineStats = ratedRestaurants.reduce((acc, r) => {
        acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topCuisine = Object.entries(cuisineStats)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCuisine) {
        items.push({
          id: 'trending-cuisine',
          type: 'trending',
          timestamp: new Date(),
          content: {
            type: 'cuisine_trend',
            cuisine: topCuisine[0],
            count: topCuisine[1],
            restaurants: ratedRestaurants.filter(r => r.cuisine === topCuisine[0]).slice(0, 3)
          },
          priority: 6
        });
      }

      // AI Recommendations placeholder
      items.push({
        id: 'ai-recommendations',
        type: 'recommendation',
        timestamp: new Date(),
        content: {
          type: 'ai_suggestions',
          title: 'Discover New Flavors',
          description: 'AI-powered recommendations based on your taste',
          suggestions: ['Try Japanese cuisine near you', 'Explore fine dining options', 'Find hidden gems']
        },
        priority: 7
      });

      // Sort by priority and timestamp
      return items.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    };

    setFeedItems(generateFeedItems());
  }, [restaurants, profile, ratedRestaurants, recentRestaurants]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredItems = feedItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'personal') return item.type === 'restaurant_rating' || item.type === 'milestone';
    if (filter === 'recommendations') return item.type === 'recommendation';
    if (filter === 'friends') return item.type === 'friend_activity';
    return true;
  });

  const renderFeedItem = (item: FeedItem) => {
    switch (item.type) {
      case 'restaurant_rating':
        const { restaurant, user, isOwn } = item.content;
        return (
          <Card key={item.id} className="bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-center space-x-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.name?.[0] || user?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">
                      {isOwn ? 'You' : (user?.name || user?.username || 'Someone')}
                    </span>
                    <span className="text-muted-foreground text-sm">rated a restaurant</span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {/* Restaurant Content */}
              <div className="bg-muted/30 rounded-lg p-4 mb-3">
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center flex-shrink-0">
                    {restaurant.photos && restaurant.photos.length > 0 ? (
                      <LazyImage
                        src={restaurant.photos[0]}
                        alt={restaurant.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <ChefHat className="h-8 w-8 text-white" />
                    )}
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
                      {restaurant.michelinStars && (
                        <Badge variant="secondary" className="text-xs">
                          {restaurant.michelinStars}⭐
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {restaurant.notes && (
                  <p className="text-sm text-muted-foreground mt-3 italic">
                    "{restaurant.notes}"
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span className="text-xs">Like</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    <span className="text-xs">Comment</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                    <Share2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Share</span>
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-primary">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="text-xs">View</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case 'milestone':
        const { title, description, count: milestoneCount } = item.content;
        return (
          <Card key={item.id} className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
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
                  {formatTimeAgo(item.timestamp)}
                </span>
              </div>
            </CardContent>
          </Card>
        );

      case 'trending':
        const { cuisine, count: cuisineCount, restaurants: trendingRestaurants } = item.content;
        return (
          <Card key={item.id} className="bg-card border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Your {cuisine} Journey</h3>
                  <p className="text-sm text-muted-foreground">
                    You've explored {cuisineCount} {cuisine.toLowerCase()} restaurants
                  </p>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                {trendingRestaurants.slice(0, 2).map((restaurant: any) => (
                  <div key={restaurant.id} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                    <ChefHat className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{restaurant.name}</span>
                    <div className="flex items-center space-x-1 ml-auto">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{restaurant.rating}</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate('rated')}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Explore More {cuisine}
              </Button>
            </CardContent>
          </Card>
        );

      case 'recommendation':
        const { title: recTitle, description: recDescription, suggestions } = item.content;
        return (
          <Card key={item.id} className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{recTitle}</h3>
                  <p className="text-sm text-muted-foreground">{recDescription}</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                {suggestions.map((suggestion: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-2 rounded-lg bg-white/50 dark:bg-white/5">
                    <Bot className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                ))}
              </div>

              <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" onClick={() => onNavigate('search')}>
                <Search className="h-4 w-4 mr-2" />
                Explore AI Recommendations
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
          {filteredItems.length > 0 ? (
            filteredItems.map(renderFeedItem)
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
        {filteredItems.length > 0 && (
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
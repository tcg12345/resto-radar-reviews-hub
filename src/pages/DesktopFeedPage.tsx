import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, Star, Clock, MapPin, Users, ChefHat, Filter, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MichelinStars } from '@/components/MichelinStars';
import { LazyImage } from '@/components/LazyImage';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';

interface FeedItem {
  id: string;
  type: 'restaurant_visit' | 'wishlist_add' | 'friend_join';
  user: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    cuisine: string;
    rating?: number;
    address: string;
    city: string;
    country: string;
    michelin_stars?: number;
    price_range?: number;
    photos?: string[];
    notes?: string;
  };
  created_at: string;
  date_visited?: string;
  is_wishlist: boolean;
}

export function DesktopFeedPage() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadFeed(true);
    }
  }, [user]);

  const loadFeed = async (reset = false) => {
    if (!user) return;

    try {
      const currentPage = reset ? 0 : page;
      const pageSize = 15;
      
      // Get recent restaurant activities from friends
      const { data: activities, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          cuisine,
          rating,
          address,
          city,
          country,
          michelin_stars,
          price_range,
          photos,
          notes,
          created_at,
          date_visited,
          is_wishlist,
          user_id
        `)
        .order('created_at', { ascending: false })
        .range(currentPage * pageSize, (currentPage + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching feed:', error);
        toast.error('Failed to load feed');
        return;
      }

      // Get friends and profiles data
      const { data: friends } = await supabase
        .rpc('get_friends_with_scores', { requesting_user_id: user.id });
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar_url, is_public');

      const friendIds = friends?.map(f => f.friend_id) || [];
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      // Filter to only show activities from friends
      const filteredActivities = activities?.filter(activity => 
        friendIds.includes(activity.user_id) && activity.user_id !== user.id
      ) || [];

      // Transform to feed items
      const newFeedItems: FeedItem[] = filteredActivities.map(activity => {
        const profile = profileMap.get(activity.user_id);
        return {
          id: activity.id,
          type: activity.is_wishlist ? 'wishlist_add' : 'restaurant_visit',
          user: {
            id: activity.user_id,
            name: profile?.name || 'Unknown User',
            username: profile?.username || 'unknown',
            avatar_url: profile?.avatar_url,
          },
          restaurant: {
            id: activity.id,
            name: activity.name,
            cuisine: activity.cuisine,
            rating: activity.rating,
            address: activity.address,
            city: activity.city,
            country: activity.country,
            michelin_stars: activity.michelin_stars,
            price_range: activity.price_range,
            photos: activity.photos,
            notes: activity.notes,
          },
          created_at: activity.created_at,
          date_visited: activity.date_visited,
          is_wishlist: activity.is_wishlist,
        };
      });

      if (reset) {
        setFeedItems(newFeedItems);
        setPage(1);
      } else {
        setFeedItems(prev => [...prev, ...newFeedItems]);
        setPage(prev => prev + 1);
      }

      setHasMore(newFeedItems.length === pageSize);
      
    } catch (error) {
      console.error('Error loading feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };

  const filteredFeedItems = feedItems.filter(item => {
    if (!searchQuery) return true;
    return (
      item.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.restaurant?.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.restaurant?.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const renderFeedItem = (item: FeedItem) => {
    const { restaurant, user: itemUser, type, created_at, date_visited } = item;
    
    return (
      <Card key={item.id} className="hover:shadow-md transition-shadow duration-200 bg-background border border-border/50">
        <CardContent className="p-6 space-y-4">
          {/* User Info Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={itemUser.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                  {itemUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{itemUser.name}</span>
                  <span className="text-sm text-muted-foreground">@{itemUser.username}</span>
                  <span className="text-sm text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{formatTimeAgo(created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === 'wishlist_add' 
                    ? `Added ${restaurant?.name} to their wishlist` 
                    : `Visited ${restaurant?.name}`
                  }
                  {date_visited && type === 'restaurant_visit' && (
                    <span className="ml-1">on {new Date(date_visited).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              <Star className="h-4 w-4" />
            </Button>
          </div>

          {/* Restaurant Content */}
          {restaurant && (
            <div className="space-y-4">
              {/* Restaurant Header */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* Restaurant Info */}
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-xl font-semibold">{restaurant.name}</h3>
                      {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                        <MichelinStars stars={restaurant.michelin_stars} size="md" />
                      )}
                      {restaurant.price_range && (
                        <span className="text-lg font-medium text-muted-foreground">
                          {getPriceDisplay(restaurant.price_range)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-sm">
                        <ChefHat className="h-4 w-4 mr-2" />
                        {restaurant.cuisine}
                      </Badge>
                      {restaurant.rating && !item.is_wishlist && (
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{restaurant.rating}/5</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{restaurant.address}, {restaurant.city}, {restaurant.country}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {restaurant.notes && (
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="leading-relaxed">{restaurant.notes}</p>
                    </div>
                  )}
                </div>

                {/* Photo */}
                {restaurant.photos && restaurant.photos.length > 0 && (
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <LazyImage
                      src={restaurant.photos[0]}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                    {restaurant.photos.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white text-sm px-3 py-1 rounded-full backdrop-blur-sm">
                        +{restaurant.photos.length - 1} photos
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <div className="flex items-center gap-8">
                  <Button variant="ghost" className="text-muted-foreground hover:text-red-500 transition-colors">
                    <Heart className="h-5 w-5 mr-2" />
                    <span>Like</span>
                  </Button>
                  
                  <Button variant="ghost" className="text-muted-foreground hover:text-primary transition-colors">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    <span>Comment</span>
                  </Button>
                  
                  <Button variant="ghost" className="text-muted-foreground hover:text-primary transition-colors">
                    <Share className="h-5 w-5 mr-2" />
                    <span>Share</span>
                  </Button>
                </div>
                
                <Button variant="outline" size="sm" className="hover:bg-primary hover:text-primary-foreground transition-colors">
                  View Details
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading && feedItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-3 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Your Feed</h1>
                <p className="text-muted-foreground">Discover what your friends are eating</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <Plus className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
          
          {/* Search and Quick Actions */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search restaurants, cuisines, friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div className="md:col-span-2 flex gap-2">
              <Button variant="outline" className="flex-1 gap-2">
                <Users className="h-4 w-4" />
                Friends
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <Star className="h-4 w-4" />
                Top Rated
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <MapPin className="h-4 w-4" />
                Nearby
              </Button>
            </div>
          </div>
        </div>

        {/* Feed Content */}
        <div className="space-y-6">
          {filteredFeedItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto space-y-6">
                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                  <Users className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Your feed is empty</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Follow friends to see their restaurant visits and discover new places to try! 
                    You can also explore public posts from food enthusiasts in your area.
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    Find Friends
                  </Button>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Restaurant
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {filteredFeedItems.map(renderFeedItem)}
              
              <InfiniteScrollLoader
                hasMore={hasMore}
                isLoading={isLoading}
                onLoadMore={() => loadFeed(false)}
                loadMoreText="Load more posts"
                className="mt-8"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
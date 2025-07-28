import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, Star, Clock, MapPin, Users, ChefHat, Filter, Plus } from 'lucide-react';
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

export function MobileFeedPage() {
  const { user } = useAuth();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadFeed(true);
    }
  }, [user]);

  const loadFeed = async (reset = false) => {
    if (!user) return;

    try {
      const currentPage = reset ? 0 : page;
      const pageSize = 20;
      
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
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };

  const renderFeedItem = (item: FeedItem) => {
    const { restaurant, user: itemUser, type, created_at, date_visited } = item;
    
    return (
      <Card key={item.id} className="border-0 border-b border-border/20 rounded-none bg-background">
        <CardContent className="p-4 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={itemUser.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                {itemUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{itemUser.name}</span>
                <span className="text-xs text-muted-foreground">@{itemUser.username}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">{formatTimeAgo(created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {type === 'wishlist_add' 
                  ? `Added ${restaurant?.name} to wishlist` 
                  : `Visited ${restaurant?.name}`
                }
                {date_visited && type === 'restaurant_visit' && (
                  <span className="ml-1">on {new Date(date_visited).toLocaleDateString()}</span>
                )}
              </p>
            </div>
          </div>

          {/* Restaurant Info */}
          {restaurant && (
            <div className="space-y-3">
              {/* Restaurant Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{restaurant.name}</h3>
                      {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                        <MichelinStars stars={restaurant.michelin_stars} size="sm" />
                      )}
                      {restaurant.price_range && (
                        <span className="text-sm font-medium text-muted-foreground">
                          {getPriceDisplay(restaurant.price_range)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        <ChefHat className="h-3 w-3 mr-1" />
                        {restaurant.cuisine}
                      </Badge>
                      {restaurant.rating && !item.is_wishlist && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{restaurant.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{restaurant.city}, {restaurant.country}</span>
                </div>
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
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      +{restaurant.photos.length - 1}
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              {restaurant.notes && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm leading-relaxed">{restaurant.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-6">
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-red-500">
                    <Heart className="h-5 w-5 mr-2" />
                    <span className="text-sm">Like</span>
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-primary">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    <span className="text-sm">Comment</span>
                  </Button>
                  
                  <Button variant="ghost" size="sm" className="p-0 h-auto text-muted-foreground hover:text-primary">
                    <Share className="h-5 w-5 mr-2" />
                    <span className="text-sm">Share</span>
                  </Button>
                </div>
                
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary">
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
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/20">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Feed</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-9 w-9 p-0"
              >
                <Plus className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <Users className="h-3 w-3 mr-1" />
              Friends
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <Star className="h-3 w-3 mr-1" />
              Top Rated
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <MapPin className="h-3 w-3 mr-1" />
              Nearby
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0 h-8 px-3">
              <ChefHat className="h-3 w-3 mr-1" />
              Trending
            </Button>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <ScrollArea className="flex-1">
        <div className="pb-4">
          {feedItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your feed is empty</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto mb-6">
                Follow friends to see their restaurant visits and discover new places to try!
              </p>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Find Friends
              </Button>
            </div>
          ) : (
            <>
              {feedItems.map(renderFeedItem)}
              
              <InfiniteScrollLoader
                hasMore={hasMore}
                isLoading={isLoading}
                onLoadMore={() => loadFeed(false)}
                loadMoreText="Load more posts"
                className="mt-4"
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
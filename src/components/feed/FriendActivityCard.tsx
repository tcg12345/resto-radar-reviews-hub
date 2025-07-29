import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Heart, MessageCircle, Share2, Clock, Utensils } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';

interface FriendActivityCardProps {
  friend: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    address: string;
    city: string;
    rating?: number;
    photos: string[];
    price_range?: number;
    michelin_stars?: number;
  };
  activity: {
    type: 'rating' | 'review' | 'wishlist';
    timestamp: string;
    rating?: number;
    review?: string;
  };
  onRestaurantClick: (restaurantId: string) => void;
  onFriendClick: (friendId: string) => void;
}

export function FriendActivityCard({
  friend,
  restaurant,
  activity,
  onRestaurantClick,
  onFriendClick
}: FriendActivityCardProps) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now.getTime() - activityTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return activityTime.toLocaleDateString();
  };

  const getActivityText = () => {
    switch (activity.type) {
      case 'rating':
        return `rated ${restaurant.name}`;
      case 'review':
        return `reviewed ${restaurant.name}`;
      case 'wishlist':
        return `added ${restaurant.name} to wishlist`;
      default:
        return `visited ${restaurant.name}`;
    }
  };

  return (
    <Card className="bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-6">
        {/* Friend Header */}
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onFriendClick(friend.id)}
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarImage src={friend.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {friend.name?.[0] || friend.username?.[0] || 'F'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {friend.name || friend.username}
              </p>
              <p className="text-muted-foreground text-xs">
                {getActivityText()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{formatTimeAgo(activity.timestamp)}</span>
          </div>
        </div>

        {/* Restaurant Content */}
        <div 
          className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 mb-4 cursor-pointer hover:from-muted/40 hover:to-muted/20 transition-all duration-300"
          onClick={() => onRestaurantClick(restaurant.id)}
        >
          <div className="flex gap-4">
            {/* Restaurant Image */}
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5">
              {restaurant.photos?.[0] ? (
                <LazyImage
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="h-8 w-8 text-primary/60" />
                </div>
              )}
            </div>

            {/* Restaurant Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-lg leading-tight mb-1 truncate">
                {restaurant.name}
              </h3>
              <p className="text-muted-foreground text-sm mb-2">
                {restaurant.cuisine} • {restaurant.city}
              </p>
              
              {/* Rating */}
              {activity.rating && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-xs text-yellow-700 dark:text-yellow-300">
                      {activity.rating}
                    </span>
                  </div>
                </div>
              )}

              {/* Restaurant Details */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="text-xs truncate">{restaurant.address}</span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2">
                {restaurant.price_range && (
                  <Badge variant="outline" className="text-xs">
                    {'$'.repeat(restaurant.price_range)}
                  </Badge>
                )}
                {restaurant.michelin_stars && (
                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20">
                    {restaurant.michelin_stars}⭐
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Review Text */}
          {activity.review && (
            <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-sm text-foreground italic">
                "{activity.review}"
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-xs">Like</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">Comment</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="text-xs">Share</span>
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-3 text-primary hover:text-primary/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRestaurantClick(restaurant.id);
            }}
          >
            <span className="text-xs font-medium">View Details</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, MessageCircle, Heart, Share2, ChefHat } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { formatDistanceToNow } from 'date-fns';

interface FriendActivity {
  id: string;
  friend: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
  };
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    rating: number;
    priceRange?: number;
    michelinStars?: number;
    photos: string[];
    address: string;
    city: string;
    notes?: string;
  };
  timestamp: Date;
  type: 'rating' | 'wishlist' | 'visit';
}

interface Props {
  activity: FriendActivity;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onViewRestaurant?: () => void;
}

export function FriendActivityCard({ 
  activity, 
  onLike, 
  onComment, 
  onShare, 
  onViewRestaurant 
}: Props) {
  const getActionText = () => {
    switch (activity.type) {
      case 'rating':
        return 'rated';
      case 'wishlist':
        return 'added to wishlist';
      case 'visit':
        return 'visited';
      default:
        return 'interacted with';
    }
  };

  return (
    <Card className="bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.friend.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {activity.friend.name?.[0] || activity.friend.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm">
                {activity.friend.name || activity.friend.username}
              </span>
              <span className="text-muted-foreground text-sm">
                {getActionText()} a restaurant
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Restaurant Content */}
        <div className="bg-muted/30 rounded-lg p-4 mb-3 cursor-pointer" onClick={onViewRestaurant}>
          <div className="flex items-start space-x-3">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center flex-shrink-0">
              {activity.restaurant.photos && activity.restaurant.photos.length > 0 ? (
                <LazyImage
                  src={activity.restaurant.photos[0]}
                  alt={activity.restaurant.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <ChefHat className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground mb-1">
                {activity.restaurant.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {activity.restaurant.cuisine} • {activity.restaurant.city}
              </p>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                {activity.type === 'rating' && activity.restaurant.rating && (
                  <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-xs text-yellow-700 dark:text-yellow-300">
                      {activity.restaurant.rating}
                    </span>
                  </div>
                )}
                {activity.restaurant.priceRange && (
                  <Badge variant="outline" className="text-xs">
                    {'$'.repeat(activity.restaurant.priceRange)}
                  </Badge>
                )}
                {activity.restaurant.michelinStars && (
                  <Badge variant="secondary" className="text-xs">
                    {activity.restaurant.michelinStars}⭐
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {activity.restaurant.notes && activity.type === 'rating' && (
            <p className="text-sm text-muted-foreground mt-3 italic">
              "{activity.restaurant.notes}"
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={onLike}
            >
              <Heart className="h-4 w-4 mr-1" />
              <span className="text-xs">Like</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={onComment}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">Comment</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-primary"
            onClick={onViewRestaurant}
          >
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-xs">View</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
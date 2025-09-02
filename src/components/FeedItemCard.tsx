import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExpertBadge } from '@/components/ExpertBadge';
import { MichelinStars } from '@/components/MichelinStars';
import { FeedItem } from '@/types/feed';
import { formatDistanceToNow } from 'date-fns';

interface FeedItemCardProps {
  item: FeedItem;
  onRestaurantClick?: (item: FeedItem) => void;
  onUserClick?: (userId: string) => void;
}

export function FeedItemCard({ item, onRestaurantClick, onUserClick }: FeedItemCardProps) {
  const navigate = useNavigate();
  const isExpert = item.type.startsWith('expert');
  const isReview = item.type.includes('review');
  const rating = item.overall_rating || item.rating;

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return null;
    return '$'.repeat(Math.min(priceLevel, 4));
  };

  const handleRestaurantClick = () => {
    if (onRestaurantClick) {
      onRestaurantClick(item);
    } else if (item.place_id || item.google_place_id) {
      navigate(`/restaurant/${item.place_id || item.google_place_id}?name=${encodeURIComponent(item.restaurant_name)}`);
    }
  };

  const handleUserClick = () => {
    if (onUserClick) {
      onUserClick(item.user_id);
    } else {
      navigate(`/friend-profile/${item.user_id}`);
    }
  };

  const getActivityText = () => {
    if (isReview) {
      return isExpert ? 'wrote an expert review for' : 'reviewed';
    } else {
      return isExpert ? 'rated as an expert' : 'visited and rated';
    }
  };

  return (
    <Card className="border-0 border-b border-border/50 rounded-none hover:bg-muted/30 transition-colors">
      <CardContent className="p-4">
        {/* Header: User info */}
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            className="p-0 h-auto"
            onClick={handleUserClick}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={item.avatar_url || ''} alt={item.name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {(item.name || item.username || 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Button
                variant="ghost"
                className="p-0 h-auto font-medium text-sm hover:underline"
                onClick={handleUserClick}
              >
                {item.name || item.username}
              </Button>
              {isExpert && <ExpertBadge size="sm" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{getActivityText()}</span>
              <Clock className="h-3 w-3" />
              <span>{formatTimeAgo(item.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Restaurant info and rating */}
        <div className="ml-13"> {/* Offset content under avatar */}
          <Button
            variant="ghost"
            className="p-0 h-auto w-full text-left"
            onClick={handleRestaurantClick}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate hover:underline">
                  {item.restaurant_name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">
                    {item.city && item.country 
                      ? `${item.city}, ${item.country}` 
                      : item.restaurant_address || 'Location unknown'}
                  </span>
                </div>
              </div>
              
              {/* Rating and price */}
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {rating && (
                  <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3 text-primary fill-primary" />
                    <span className="text-sm font-medium text-primary">
                      {Number(rating).toFixed(1)}
                    </span>
                  </div>
                )}
                {item.price_range && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    {getPriceDisplay(item.price_range)}
                  </Badge>
                )}
              </div>
            </div>
          </Button>

          {/* Additional tags */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.cuisine && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {item.cuisine}
              </Badge>
            )}
            {item.michelin_stars && item.michelin_stars > 0 && (
              <MichelinStars stars={item.michelin_stars} size="sm" />
            )}
            {item.date_visited && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                Visited {new Date(item.date_visited).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* Review text */}
          {(item.review_text || item.notes) && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
                {item.review_text || item.notes}
              </p>
            </div>
          )}

          {/* Photos */}
          {item.photos && item.photos.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {item.photos.slice(0, 4).map((url, idx) => (
                  <img 
                    key={idx} 
                    src={url} 
                    alt={item.photo_dish_names?.[idx] || `Photo ${idx + 1}`} 
                    className="h-20 w-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
                {item.photos.length > 4 && (
                  <div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-muted-foreground font-medium">
                      +{item.photos.length - 4}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
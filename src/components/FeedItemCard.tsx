import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
      return isExpert ? 'rated as an expert' : 'is at';
    }
  };

  return (
    <div className="p-5">
      {/* Header: User info */}
      <div className="flex items-start gap-4">
        <button onClick={handleUserClick} className="flex-shrink-0">
          <Avatar className="h-12 w-12 border-2 border-primary/10">
            <AvatarImage src={item.avatar_url || ''} alt={item.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {(item.name || item.username || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-body mb-1">
            <button onClick={handleUserClick} className="font-bold text-foreground hover:underline">
              {item.name || item.username}
            </button>
            {isExpert && <ExpertBadge size="sm" />}
            <span className="text-muted-foreground"> {getActivityText()} </span>
            <button onClick={handleRestaurantClick} className="font-bold text-primary hover:underline">
              {item.restaurant_name}
            </button>
          </p>

          {/* Location & time */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            {(item.city || item.restaurant_address) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.city && item.country ? `${item.city}, ${item.country}` : item.restaurant_address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(item.created_at)}
            </span>
          </div>

          {/* Photo */}
          {item.photos && item.photos.length > 0 && (
            <div 
              className="bg-surface-container-lowest rounded-xl overflow-hidden mb-3 cursor-pointer"
              onClick={handleRestaurantClick}
            >
              <img
                src={item.photos[0]}
                alt={item.restaurant_name}
                className="w-full aspect-[16/9] object-cover hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              {item.photos.length > 1 && (
                <div className="flex gap-1 p-1">
                  {item.photos.slice(1, 4).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={item.photo_dish_names?.[idx + 1] || `Photo ${idx + 2}`}
                      className="h-16 flex-1 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rating tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {rating && (
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[11px] font-bold tracking-wide">
                <Star className="h-3 w-3 fill-primary inline mr-1" />
                {Number(rating).toFixed(1)}
              </span>
            )}
            {item.cuisine && (
              <span className="bg-surface-container-high text-muted-foreground px-3 py-1 rounded-full text-[11px] font-medium">
                {item.cuisine}
              </span>
            )}
            {item.price_range && (
              <span className="bg-surface-container-high text-muted-foreground px-3 py-1 rounded-full text-[11px] font-medium">
                {getPriceDisplay(item.price_range)}
              </span>
            )}
            {item.michelin_stars && item.michelin_stars > 0 && (
              <MichelinStars stars={item.michelin_stars} size="sm" />
            )}
          </div>

          {/* Review text */}
          {(item.review_text || item.notes) && (
            <div className="mt-3 p-3 bg-surface-container rounded-xl">
              <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3 font-body">
                {item.review_text || item.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

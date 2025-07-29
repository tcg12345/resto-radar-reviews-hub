import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Plus, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecommendationCardProps {
  restaurant: {
    name: string;
    cuisine: string;
    address: string;
    distance?: number;
    rating?: number;
    priceRange?: number;
    openingHours?: string;
    isOpen?: boolean;
    photos?: string[];
  };
  onAdd?: () => void;
  onAddToWishlist?: () => void;
}

export function RecommendationCard({ restaurant, onAdd, onAddToWishlist }: RecommendationCardProps) {
  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return `${distance.toFixed(1)} mi`;
  };

  const getOpeningStatus = () => {
    if (restaurant.isOpen === undefined) return '';
    if (restaurant.isOpen) {
      return `Open${restaurant.openingHours ? ` • ${restaurant.openingHours}` : ''}`;
    }
    return `Closed${restaurant.openingHours ? ` • Opens ${restaurant.openingHours}` : ''}`;
  };

  return (
    <div className="border-b border-border py-4 hover:bg-muted/50 transition-colors duration-200 -mx-4">
      <div className="px-4">
      {/* Header with name and rating */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-lg text-foreground leading-tight">{restaurant.name}</h3>
        {restaurant.rating && (
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{restaurant.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Cuisine and price */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground text-sm">{getPriceDisplay(restaurant.priceRange)}</span>
        {restaurant.priceRange && restaurant.cuisine && (
          <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
        )}
        <span className="text-muted-foreground text-sm">{restaurant.cuisine}</span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{restaurant.address}</span>
      </div>

      {/* Distance, hours, and action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {restaurant.distance && (
            <span className="text-xs text-muted-foreground">{formatDistance(restaurant.distance)}</span>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{getOpeningStatus()}</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            onClick={onAdd}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            onClick={onAddToWishlist}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
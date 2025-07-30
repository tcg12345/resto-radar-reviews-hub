import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Plus, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

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
    place_id?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    website?: string;
    phone?: string;
  };
  onAdd?: () => void;
  onAddToWishlist?: () => void;
}

export function RecommendationCard({ restaurant, onAdd, onAddToWishlist }: RecommendationCardProps) {
  const navigate = useNavigate();
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

  const handleCardClick = () => {
    // Navigate to recommendation detail page with restaurant data
    const place_id = restaurant.place_id || 'unknown';
    navigate(`/recommendation/${place_id}`, {
      state: { restaurant }
    });
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation(); // Prevent card click when clicking buttons
    action();
  };

  return (
    <div 
      className="lg:border lg:border-border lg:rounded-lg lg:p-4 lg:shadow-sm lg:hover:shadow-md lg:bg-card border-b border-border py-4 hover:bg-muted/50 lg:hover:bg-muted/30 transition-all duration-200 lg:mx-0 -mx-4 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="lg:px-0 px-4">
      {/* Header with name and rating */}
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-lg text-foreground leading-tight">{restaurant.name}</h3>
        {restaurant.rating && (
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{restaurant.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Cuisine and price */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground text-sm">{getPriceDisplay(restaurant.priceRange)}</span>
        {restaurant.priceRange && restaurant.cuisine && (
          <span className="w-1 h-1 rounded-full bg-muted-foreground"></span>
        )}
        <span className="text-muted-foreground text-sm">{restaurant.cuisine}</span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-2">
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
            onClick={(e) => handleButtonClick(e, onAdd || (() => {}))}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => handleButtonClick(e, onAddToWishlist || (() => {}))}
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
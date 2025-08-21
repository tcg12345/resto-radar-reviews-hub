import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Plus, Heart, Star } from 'lucide-react';
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
      className="mx-1 mb-4 rounded-xl shadow-md bg-[rgb(24,24,27)] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.005] active:scale-[0.995]"
      onClick={handleCardClick}
    >
      <div className="p-4">
        {/* Header with name and rating */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-bold text-lg text-white leading-snug mb-1">
              {restaurant.name}
            </h3>
            
            {/* Price and cuisine row */}
            <div className="flex items-center gap-2">
              {restaurant.priceRange && (
                <span className="text-emerald-400 font-semibold text-sm">
                  {getPriceDisplay(restaurant.priceRange)}
                </span>
              )}
              {restaurant.priceRange && restaurant.cuisine && (
                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              )}
              <span className="text-slate-400 text-sm">{restaurant.cuisine}</span>
            </div>
          </div>
          
          {/* Rating pill badge - smaller and cleaner */}
          {restaurant.rating && (
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                <Star className="h-2.5 w-2.5 text-amber-400" fill="currentColor" />
                <span className="text-amber-100 font-medium text-xs">
                  {restaurant.rating.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
          <span className="text-slate-400 text-xs leading-relaxed">
            {restaurant.address}
          </span>
        </div>

        {/* Status and hours */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {restaurant.distance && (
              <span className="text-slate-500 text-xs">
                {formatDistance(restaurant.distance)}
              </span>
            )}
            
            {/* Status badge and hours */}
            <div className="flex items-center gap-2">
              {restaurant.isOpen !== undefined && (
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  restaurant.isOpen 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </div>
              )}
              
              {restaurant.openingHours && (
                <span className="text-slate-500 text-xs">
                  {restaurant.openingHours}
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons - smaller and cleaner */}
          <div className="flex gap-1.5">
            <button
              onClick={(e) => handleButtonClick(e, onAdd || (() => {}))}
              className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-white hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => handleButtonClick(e, onAddToWishlist || (() => {}))}
              className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-white/20 hover:text-red-400 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Heart className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
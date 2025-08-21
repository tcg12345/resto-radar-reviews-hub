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
      className="mx-4 mb-4 rounded-2xl shadow-lg bg-[rgb(24,24,27)] border border-white/10 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
      onClick={handleCardClick}
    >
      <div className="p-5">
        {/* Header with name and rating */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-white leading-tight mb-1 truncate">
              {restaurant.name}
            </h3>
            
            {/* Price and cuisine row */}
            <div className="flex items-center gap-2 mb-2">
              {restaurant.priceRange && (
                <span className="text-emerald-400 font-medium text-sm">
                  {getPriceDisplay(restaurant.priceRange)}
                </span>
              )}
              {restaurant.priceRange && restaurant.cuisine && (
                <span className="w-1 h-1 rounded-full bg-slate-500"></span>
              )}
              <span className="text-slate-400 text-sm">{restaurant.cuisine}</span>
            </div>
          </div>
          
          {/* Rating pill badge */}
          {restaurant.rating && (
            <div className="flex-shrink-0 ml-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
                <span className="text-amber-100 font-semibold text-sm">
                  {restaurant.rating.toFixed(1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="text-slate-400 text-sm leading-relaxed truncate">
            {restaurant.address}
          </span>
        </div>

        {/* Status and distance row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {restaurant.distance && (
              <span className="text-slate-500 text-xs font-medium">
                {formatDistance(restaurant.distance)}
              </span>
            )}
            
            {/* Status badge */}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              {restaurant.isOpen !== undefined && (
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  restaurant.isOpen 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </div>
              )}
              {restaurant.openingHours && (
                <span className="text-slate-500 text-xs ml-1">
                  {restaurant.openingHours}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={(e) => handleButtonClick(e, onAdd || (() => {}))}
            className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => handleButtonClick(e, onAddToWishlist || (() => {}))}
            className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-200 hover:text-red-400"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
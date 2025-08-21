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
      className="bg-[rgb(24,24,27)] rounded-2xl border border-white/8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.18)] transition-all duration-300 cursor-pointer mx-2 mb-4 overflow-hidden hover:scale-[1.01] animate-fade-in"
      onClick={handleCardClick}
    >
      {/* Restaurant Image Carousel (if available) */}
      {restaurant.photos && restaurant.photos.length > 0 && (
        <div className="relative h-48 w-full">
          <img 
            src={restaurant.photos[0]} 
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
          {restaurant.photos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {restaurant.photos.slice(0, 5).map((_, index) => (
                <div 
                  key={index}
                  className="h-1.5 w-1.5 rounded-full bg-white/60 aria-[current=true]:bg-white"
                  aria-current={index === 0 ? "true" : "false"}
                />
              ))}
            </div>
          )}
          <div className="absolute top-3 right-3 bg-black/35 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium">
            {restaurant.photos.length} photo{restaurant.photos.length > 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Header Row - Name + Rating */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white leading-tight truncate mb-1">{restaurant.name}</h3>
            
            {/* Cuisine + Price Row */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-300">{restaurant.cuisine}</span>
              {restaurant.priceRange && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-semibold">{getPriceDisplay(restaurant.priceRange)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Rating Badge */}
          {restaurant.rating && (
            <div className="inline-flex items-center gap-1.5 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 px-3 py-1.5 rounded-full flex-shrink-0">
              <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
              <span className="text-sm font-bold text-white">{restaurant.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Location Row */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <MapPin className="h-4 w-4 text-slate-500 flex-shrink-0" />
          <span className="truncate">{restaurant.address}</span>
          {restaurant.distance && (
            <>
              <span className="text-slate-600">•</span>
              <span className="flex-shrink-0">{formatDistance(restaurant.distance)}</span>
            </>
          )}
        </div>

        {/* Status + Hours Row */}
        {getOpeningStatus() && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-500 flex-shrink-0" />
            <span className={`text-sm font-medium ${
              restaurant.isOpen 
                ? 'text-emerald-400' 
                : 'text-rose-400'
            }`}>
              {getOpeningStatus()}
            </span>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <div className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors duration-150">
            View Details
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleButtonClick(e, onAdd || (() => {}))}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all duration-200 backdrop-blur-sm"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleButtonClick(e, onAddToWishlist || (() => {}))}
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 hover:border-rose-500/50 transition-all duration-200 backdrop-blur-sm"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
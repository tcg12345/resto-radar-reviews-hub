import { useState } from 'react';
import { Star, MapPin, Calendar, MoreVertical, Eye, Edit, ExternalLink, Phone } from 'lucide-react';
import { MichelinStarIcon } from '@/components/MichelinStarIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlaceRating } from '@/hooks/useTrips';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TripDetailPlaceCardProps {
  place: PlaceRating;
  isSelected: boolean;
  onSelect: (placeId: string) => void;
  onClick: (placeId: string) => void;
  onDetails: (placeId: string) => void;
  onEdit: (placeId: string) => void;
  compact?: boolean;
}

export function TripDetailPlaceCard({ 
  place, 
  isSelected, 
  onSelect, 
  onClick, 
  onDetails, 
  onEdit,
  compact = false 
}: TripDetailPlaceCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getPlaceIcon = (placeType: string) => {
    switch (placeType) {
      case 'restaurant': return '🍽️';
      case 'attraction': return '🎯';
      case 'hotel': return '🏨';
      default: return '📍';
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            className={`w-3 h-3 ${
              i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs font-medium ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  const renderMichelinStars = (michelinStars?: number) => {
    if (!michelinStars || michelinStars === 0) return null;
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-yellow-600">Michelin</span>
        {Array.from({ length: michelinStars }, (_, i) => (
          <MichelinStarIcon key={i} className="w-4 h-4 text-yellow-500 fill-current" />
        ))}
      </div>
    );
  };


  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:border-primary/30'
      }`}
      onClick={() => onClick(place.id)}
      onMouseEnter={() => {
        setIsHovered(true);
        onSelect(place.id);
      }}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3">
        {/* Photo if available */}
        {place.photos && place.photos.length > 0 && !compact && (
          <div className="mb-3">
            <img
              src={place.photos[0]}
              alt={place.place_name}
              className="w-full h-24 object-cover rounded-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-lg">{getPlaceIcon(place.place_type)}</span>
            <div className="min-w-0 flex-1">
              <h3 className={`font-medium line-clamp-1 ${compact ? 'text-sm' : 'text-base'}`}>
                {place.place_name}
              </h3>
              
              {/* Cuisine and Price Range Row */}
              {!compact && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {place.cuisine && (
                    <span className="text-xs text-white bg-primary px-2 py-1 rounded-full font-medium">
                      {place.cuisine}
                    </span>
                  )}
                  {place.place_type && place.place_type !== 'restaurant' && (
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full capitalize">
                      {place.place_type}
                    </span>
                  )}
                  {place.price_range && (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {getPriceDisplay(place.price_range)}
                    </span>
                  )}
                </div>
              )}

              {/* Rating and Michelin Stars */}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {place.overall_rating && renderStars(place.overall_rating)}
                {renderMichelinStars(place.michelin_stars)}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDetails(place.id); }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(place.id); }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Rating
              </DropdownMenuItem>
              {place.website && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(place.website, '_blank'); }}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Website
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Address and additional info */}
        {!compact && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {place.address && (
              <p className="line-clamp-1">{place.address}</p>
            )}
            {place.date_visited && (
              <p>Visited: {new Date(place.date_visited).toLocaleDateString()}</p>
            )}
          </div>
        )}

        {/* Notes */}
        {!compact && place.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {place.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Star, MapPin, Info, Calendar, DollarSign, Globe, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface PlaceRating {
  id: string;
  place_name: string;
  place_type: string;
  address?: string;
  overall_rating?: number;
  category_ratings?: any;
  date_visited?: string;
  notes?: string;
  photos?: string[];
  price_range?: number;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
}

interface MobileTripPlaceCardProps {
  place: PlaceRating;
  onDetailsClick: () => void;
  onPlaceClick: () => void;
}

export function MobileTripPlaceCard({ place, onDetailsClick, onPlaceClick }: MobileTripPlaceCardProps) {
  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  const getPlaceIcon = (placeType: string) => {
    switch (placeType.toLowerCase()) {
      case 'restaurant':
        return '🍽️';
      case 'hotel':
        return '🏨';
      case 'attraction':
        return '🎯';
      case 'museum':
        return '🏛️';
      case 'park':
        return '🌳';
      default:
        return '📍';
    }
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return null;
    
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
        ))}
        {halfStar && <Star className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={i} className="w-3 h-3 text-gray-300" />
        ))}
        <span className="ml-1 text-xs font-medium text-muted-foreground">{rating}/10</span>
      </div>
    );
  };

  return (
    <div 
      className="bg-card rounded-xl border border-border/50 p-4 shadow-sm active:scale-[0.98] transition-transform"
      onClick={onPlaceClick}
    >
      {/* Header with icon, name, and type */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-2xl flex-shrink-0">
          {getPlaceIcon(place.place_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-foreground truncate">
            {place.place_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {place.place_type}
            </Badge>
            {place.price_range && (
              <div className="flex items-center text-xs text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>{getPriceDisplay(place.price_range)}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick();
          }}
          className="h-8 px-3 text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/30 text-primary"
        >
          <Info className="h-3 w-3 mr-1" />
          Details
        </Button>
      </div>

      {/* Address */}
      {place.address && (
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-xs text-muted-foreground leading-relaxed">
            {place.address}
          </span>
        </div>
      )}

      {/* Rating */}
      {place.overall_rating && (
        <div className="mb-3">
          {renderStarRating(place.overall_rating)}
        </div>
      )}

      {/* Bottom row with date and quick actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {place.date_visited && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(place.date_visited), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {place.website && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
              onClick={(e) => e.stopPropagation()}
            >
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="w-3 h-3" />
              </a>
            </Button>
          )}
          {place.phone_number && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
              onClick={(e) => e.stopPropagation()}
            >
              <a href={`tel:${place.phone_number}`}>
                <Phone className="w-3 h-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Notes preview */}
      {place.notes && place.notes.trim() && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {place.notes}
          </p>
        </div>
      )}
    </div>
  );
}
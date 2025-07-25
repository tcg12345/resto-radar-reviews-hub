import React from 'react';
import { Star, MapPin, Calendar, Clock, Edit, Camera, DollarSign, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
}

interface TripPlacesListProps {
  ratings: PlaceRating[];
  selectedPlaceId: string | null;
  onPlaceSelect: (placeId: string) => void;
  onPlaceClick: (placeId: string) => void;
  onPlaceDetails: (placeId: string) => void;
  onEditPlace: (open: boolean) => void;
}

export function TripPlacesList({ ratings, selectedPlaceId, onPlaceSelect, onPlaceClick, onPlaceDetails, onEditPlace }: TripPlacesListProps) {
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

  if (ratings.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No places yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start rating places you've visited on this trip
        </p>
        <Button onClick={() => onEditPlace(true)} size="sm">
          Add Your First Place
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {ratings.map((rating) => (
        <Card
          key={rating.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedPlaceId === rating.id 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => onPlaceClick(rating.id)}
          onMouseEnter={() => onPlaceSelect(rating.id)}
        >
          <CardContent className="p-3">
            {/* Main Header Row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-lg flex-shrink-0">{getPlaceIcon(rating.place_type)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm line-clamp-1 mb-1">{rating.place_name}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {rating.place_type}
                    </Badge>
                    {rating.overall_rating && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{rating.overall_rating}/10</span>
                      </div>
                    )}
                    {rating.price_range && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {getPriceDisplay(rating.price_range)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaceDetails(rating.id);
                  }}
                  className="h-7 px-2 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30"
                >
                  <Info className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPlace(true);
                  }}
                  className="h-7 px-2 text-xs border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Secondary Info Row */}
            <div className="space-y-1">
              {rating.address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="line-clamp-1 min-w-0">{rating.address}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {rating.date_visited && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}</span>
                  </div>
                )}

                {rating.photos && rating.photos.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    <span>{rating.photos.length} photo{rating.photos.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import React from 'react';
import { Star, MapPin, Calendar, Clock, Edit, Camera, DollarSign } from 'lucide-react';
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
  onEditPlace: (open: boolean) => void;
}

export function TripPlacesList({ ratings, selectedPlaceId, onPlaceSelect, onEditPlace }: TripPlacesListProps) {
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
          onClick={() => onPlaceSelect(rating.id)}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getPlaceIcon(rating.place_type)}</span>
                    <h3 className="font-semibold text-sm line-clamp-1">{rating.place_name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {rating.place_type}
                    </Badge>
                    {rating.overall_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{rating.overall_rating}/10</span>
                      </div>
                    )}
                    {rating.price_range && (
                      <Badge variant="outline" className="text-xs">
                        {getPriceDisplay(rating.price_range)}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditPlace(true);
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>

              {/* Address */}
              {rating.address && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span className="line-clamp-1">{rating.address}</span>
                </div>
              )}

              {/* Date Visited */}
              {rating.date_visited && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}</span>
                </div>
              )}

              {/* Notes Preview */}
              {rating.notes && (
                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                  "{rating.notes}"
                </p>
              )}

              {/* Photos Preview */}
              {rating.photos && rating.photos.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Camera className="w-3 h-3" />
                  <span>{rating.photos.length} photo{rating.photos.length > 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Category Ratings Preview */}
              {rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(rating.category_ratings).slice(0, 2).map(([category, score]) => (
                    <Badge key={category} variant="outline" className="text-xs">
                      {category}: {score as number}/10
                    </Badge>
                  ))}
                  {Object.keys(rating.category_ratings).length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{Object.keys(rating.category_ratings).length - 2} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
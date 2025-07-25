import { useState } from 'react';
import { Star, MapPin, Calendar, MoreVertical, Eye, Edit, ExternalLink, Phone } from 'lucide-react';
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

interface TripDetailPlaceListItemProps {
  place: PlaceRating;
  isSelected: boolean;
  onSelect: (placeId: string) => void;
  onClick: (placeId: string) => void;
  onDetails: (placeId: string) => void;
  onEdit: (placeId: string) => void;
  compact?: boolean;
}

export function TripDetailPlaceListItem({ 
  place, 
  isSelected, 
  onSelect, 
  onClick, 
  onDetails, 
  onEdit,
  compact = false 
}: TripDetailPlaceListItemProps) {
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

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-sm group ${
        isSelected ? 'ring-2 ring-primary shadow-sm bg-primary/5' : 'hover:border-primary/30'
      }`}
      onClick={() => onClick(place.id)}
      onMouseEnter={() => onSelect(place.id)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-lg flex-shrink-0">{getPlaceIcon(place.place_type)}</span>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-medium line-clamp-1 ${compact ? 'text-sm' : 'text-base'}`}>
                  {place.place_name}
                </h3>
                <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
                  {place.place_type}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {place.address && (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="line-clamp-1">{place.address}</span>
                  </div>
                )}
                
                {place.date_visited && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(place.date_visited), 'MMM d')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {!compact && (
              <div className="text-right">
                {place.overall_rating ? (
                  renderStars(place.overall_rating)
                ) : (
                  <span className="text-xs text-muted-foreground">Not rated</span>
                )}
                {place.price_range && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {getPriceDisplay(place.price_range)}
                  </div>
                )}
              </div>
            )}
            
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
        </div>

        {!compact && place.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1 ml-8">
            {place.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
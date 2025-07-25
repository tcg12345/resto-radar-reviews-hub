import React from 'react';
import { Star, MapPin, Calendar, Clock, Edit, Camera, DollarSign, Info, Globe, Navigation, Trash2 } from 'lucide-react';
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
  onDeletePlace: (placeId: string) => void;
  panelSize: number; // Panel size as percentage
}

export function TripPlacesList({ 
  ratings, 
  selectedPlaceId, 
  onPlaceSelect, 
  onPlaceClick, 
  onPlaceDetails, 
  onEditPlace,
  onDeletePlace,
  panelSize
}: TripPlacesListProps) {
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

  const getDirectionsUrl = (rating: PlaceRating) => {
    if (rating.latitude && rating.longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${rating.latitude},${rating.longitude}`;
    } else if (rating.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(rating.address)}`;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rating.place_name)}`;
    }
  };

  // Define display modes based on panel size
  const getDisplayMode = () => {
    if (panelSize < 18) return 'minimal';
    if (panelSize < 25) return 'compact';
    if (panelSize < 35) return 'medium';
    if (panelSize < 45) return 'full';
    return 'expanded';
  };

  const displayMode = getDisplayMode();

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

  console.log('TripPlacesList render - panelSize:', panelSize, 'displayMode:', displayMode, Date.now());

  return (
    <div className={`space-y-3 ${displayMode === 'minimal' ? 'p-2' : 'p-4'}`}>
      {ratings.map((rating) => (
        <Card
          key={rating.id}
          className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
            selectedPlaceId === rating.id 
              ? 'ring-2 ring-primary bg-primary/5' 
              : 'hover:bg-muted/50'
          }`}
          onClick={() => onPlaceClick(rating.id)}
          onMouseEnter={() => onPlaceSelect(rating.id)}
        >
          <CardContent className={displayMode === 'minimal' ? "p-2" : displayMode === 'compact' ? "p-2.5" : "p-3"}>
            {displayMode === 'minimal' && (
              /* Minimal Mode - Ultra compact for very narrow panels */
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-sm flex-shrink-0">{getPlaceIcon(rating.place_type)}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-xs line-clamp-1">{rating.place_name}</h3>
                    {rating.overall_rating && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-muted-foreground">{rating.overall_rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaceDetails(rating.id);
                  }}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <Info className="h-2.5 w-2.5" />
                </Button>
              </div>
            )}

            {displayMode === 'compact' && (
              /* Compact Mode - Essential information with icon buttons */
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base flex-shrink-0">{getPlaceIcon(rating.place_type)}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">{rating.place_name}</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{rating.overall_rating}/10</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaceDetails(rating.id);
                      }}
                      className="h-6 px-1.5 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10"
                    >
                      <Info className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlace(rating.id);
                      }}
                      className="h-6 px-1.5 text-xs border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {rating.address && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground animate-fade-in">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="line-clamp-1 min-w-0">{rating.address}</span>
                  </div>
                )}
              </div>
            )}

            {displayMode === 'medium' && (
              /* Medium Mode - Add text to buttons and some category ratings */
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
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
                       <Info className="h-3 w-3 mr-1" />
                       Details
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
                       <Edit className="h-3 w-3 mr-1" />
                       Edit
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         onDeletePlace(rating.id);
                       }}
                       className="h-7 px-2 text-xs border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                     >
                       <Trash2 className="h-3 w-3 mr-1" />
                       Delete
                     </Button>
                   </div>
                </div>

                <div className="space-y-1.5">
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

                  {/* Show limited category ratings for restaurants */}
                  {rating.place_type.toLowerCase() === 'restaurant' && rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="flex flex-wrap gap-1 animate-fade-in">
                      {Object.entries(rating.category_ratings).slice(0, 2).map(([category, score]) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}: {score as number}/10
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {displayMode === 'full' && (
              /* Full Mode - Add website/directions links */
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
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
                       <Info className="h-3 w-3 mr-1" />
                       Details
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
                       <Edit className="h-3 w-3 mr-1" />
                       Edit
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         onDeletePlace(rating.id);
                       }}
                       className="h-7 px-2 text-xs border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                     >
                       <Trash2 className="h-3 w-3 mr-1" />
                       Delete
                     </Button>
                   </div>
                </div>

                <div className="space-y-2">
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

                  {/* Category ratings for restaurants */}
                  {rating.place_type.toLowerCase() === 'restaurant' && rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="flex flex-wrap gap-1 animate-fade-in">
                      {Object.entries(rating.category_ratings).slice(0, 3).map(([category, score]) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}: {score as number}/10
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Website and Directions Links */}
                  <div className="flex gap-2 animate-fade-in">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getDirectionsUrl(rating), '_blank');
                      }}
                      className="h-6 px-2 text-xs border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Directions
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {displayMode === 'expanded' && (
              /* Expanded Mode - Show everything including full category ratings */
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xl flex-shrink-0">{getPlaceIcon(rating.place_type)}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base line-clamp-1 mb-1">{rating.place_name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-sm flex-shrink-0">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <Badge variant="outline" className="text-sm flex-shrink-0">
                            {getPriceDisplay(rating.price_range)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                   <div className="flex gap-2 flex-shrink-0">
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         onPlaceDetails(rating.id);
                       }}
                       className="h-8 px-3 text-sm border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30"
                     >
                       <Info className="h-4 w-4 mr-2" />
                       View Details
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         onEditPlace(true);
                       }}
                       className="h-8 px-3 text-sm border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30"
                     >
                       <Edit className="h-4 w-4 mr-2" />
                       Edit Place
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         onDeletePlace(rating.id);
                       }}
                       className="h-8 px-3 text-sm border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                     >
                       <Trash2 className="h-4 w-4 mr-2" />
                       Delete Place
                     </Button>
                   </div>
                </div>

                <div className="space-y-3">
                  {rating.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1 min-w-0">{rating.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {rating.date_visited && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Visited {format(new Date(rating.date_visited), 'MMMM d, yyyy')}</span>
                      </div>
                    )}

                    {rating.photos && rating.photos.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>{rating.photos.length} photo{rating.photos.length > 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Full category ratings for restaurants */}
                  {rating.place_type.toLowerCase() === 'restaurant' && rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="animate-fade-in">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Category Ratings</h4>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(rating.category_ratings).map(([category, score]) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}: {score as number}/10
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Website and Directions Links */}
                  <div className="flex gap-2 animate-fade-in">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getDirectionsUrl(rating), '_blank');
                      }}
                      className="h-8 px-3 text-sm border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
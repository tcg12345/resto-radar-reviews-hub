import React from 'react';
import { Star, MapPin, Calendar, Edit, Info, Globe, Phone, Navigation, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface TripPlacesListProps {
  ratings: PlaceRating[];
  selectedPlaceId: string | null;
  onPlaceSelect: (placeId: string) => void;
  onPlaceClick: (placeId: string) => void;
  onPlaceDetails: (placeId: string) => void;
  onEditPlace: (placeId: string) => void;
  panelSize: number; // Panel size as percentage
}

export function TripPlacesList({ 
  ratings, 
  selectedPlaceId, 
  onPlaceSelect, 
  onPlaceClick, 
  onPlaceDetails, 
  onEditPlace,
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

  // Determine display mode based on panel size
  let displayMode: 'minimal' | 'compact' | 'medium' | 'full' | 'expanded';
  if (panelSize <= 15) {
    displayMode = 'minimal';
  } else if (panelSize <= 25) {
    displayMode = 'compact';
  } else if (panelSize <= 35) {
    displayMode = 'medium';
  } else if (panelSize <= 50) {
    displayMode = 'full';
  } else {
    displayMode = 'expanded';
  }

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
        <Button onClick={() => onEditPlace("")} size="sm">
          Add Your First Place
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${displayMode === 'minimal' ? 'p-2' : 'px-4 pt-4'}`}>
      {ratings.map((rating) => (
        <Card
          key={rating.id}
          className={`group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 border-border/50 hover:border-primary/30 bg-gradient-to-br from-card via-card to-card/80 backdrop-blur-sm ${
            selectedPlaceId === rating.id 
              ? 'ring-2 ring-primary/50 bg-primary/5 shadow-lg shadow-primary/20' 
              : 'hover:bg-gradient-to-br hover:from-card hover:via-muted/20 hover:to-card'
          }`}
          onClick={() => onPlaceClick(rating.id)}
          onMouseEnter={() => onPlaceSelect(rating.id)}
        >
          <CardContent className={displayMode === 'minimal' ? "p-3" : displayMode === 'compact' ? "p-4" : "p-5"}>
            {displayMode === 'minimal' && (
              /* Minimal Mode - Ultra compact for very narrow panels */
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-base flex-shrink-0">
                    {getPlaceIcon(rating.place_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1 leading-tight">
                      {rating.place_name}
                    </h3>
                    {rating.overall_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium text-muted-foreground">{rating.overall_rating}</span>
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
                  className="h-8 w-8 p-0 flex-shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            )}

            {displayMode === 'compact' && (
              /* Compact Mode - Essential information with icon buttons */
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                      {getPlaceIcon(rating.place_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground line-clamp-1 mb-2 leading-tight">
                        {rating.place_name}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs px-2 py-1 bg-muted/70 hover:bg-muted transition-colors">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-700">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <div className="flex items-center text-xs font-medium text-muted-foreground px-2 py-1 bg-muted/50 rounded-full">
                            {getPriceDisplay(rating.price_range)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaceDetails(rating.id);
                    }}
                    className="h-9 w-9 p-0 flex-shrink-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
                
                {rating.address && (
                  <div className="flex items-start gap-2 text-xs text-muted-foreground pl-13">
                    <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                    <span className="line-clamp-2 leading-relaxed">{rating.address}</span>
                  </div>
                )}
              </div>
            )}

            {displayMode === 'medium' && (
              /* Medium Mode - Add text to buttons and some category ratings */
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                      {getPlaceIcon(rating.place_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base text-foreground line-clamp-1 mb-2 leading-tight">
                        {rating.place_name}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <Badge variant="secondary" className="text-xs px-3 py-1 bg-muted/70 hover:bg-muted transition-colors">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-700">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <div className="flex items-center text-xs font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {getPriceDisplay(rating.price_range)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaceDetails(rating.id);
                    }}
                    className="h-9 px-4 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                  >
                    <Info className="h-3 w-3 mr-2" />
                    Details
                  </Button>
                </div>

                <div className="space-y-2 pl-16">
                  {rating.address && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                      <span className="line-clamp-2 leading-relaxed">{rating.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {rating.date_visited && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>

                  {rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {Object.entries(rating.category_ratings).slice(0, 2).map(([category, score]) => (
                        <div key={category} className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                          <span className="text-xs font-medium text-muted-foreground">{category}</span>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-2 h-2 ${
                                  i < Math.floor((score as number) / 2)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {displayMode === 'full' && (
              /* Full Mode - Show comprehensive details */
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                      {getPlaceIcon(rating.place_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-2 leading-tight">
                        {rating.place_name}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <Badge variant="secondary" className="text-sm px-3 py-1 bg-muted/70 hover:bg-muted transition-colors">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-yellow-700">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <div className="flex items-center text-sm font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {getPriceDisplay(rating.price_range)}
                          </div>
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
                      className="h-10 px-4 text-sm border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlace(rating.id);
                      }}
                      className="h-10 px-4 text-sm border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pl-18">
                  {rating.address && (
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                      <span className="leading-relaxed">{rating.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {rating.date_visited && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {rating.website && (
                      <a 
                        href={rating.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Website</span>
                      </a>
                    )}
                    {rating.phone_number && (
                      <a 
                        href={`tel:${rating.phone_number}`}
                        className="flex items-center gap-2 text-green-600 hover:text-green-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  {rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Category Ratings</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(rating.category_ratings).map(([category, score]) => (
                          <div key={category} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">{category}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor((score as number) / 2)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-xs text-muted-foreground">
                                {score as number}/10
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rating.notes && rating.notes.trim() && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Notes</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-lg">
                        {rating.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {displayMode === 'expanded' && (
              /* Expanded Mode - Full card with all details and photos */
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-2xl flex-shrink-0 shadow-lg">
                      {getPlaceIcon(rating.place_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xl text-foreground line-clamp-1 mb-3 leading-tight">
                        {rating.place_name}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <Badge variant="secondary" className="text-sm px-4 py-1 bg-muted/70 hover:bg-muted transition-colors">
                          {rating.place_type}
                        </Badge>
                        {rating.overall_rating && (
                          <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-bold text-yellow-700">{rating.overall_rating}/10</span>
                          </div>
                        )}
                        {rating.price_range && (
                          <div className="flex items-center text-sm font-medium text-muted-foreground px-4 py-2 bg-muted/50 rounded-full">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {getPriceDisplay(rating.price_range)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaceDetails(rating.id);
                      }}
                      className="h-11 px-5 text-sm border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlace(rating.id);
                      }}
                      className="h-11 px-5 text-sm border-muted-foreground/20 hover:bg-muted/50 hover:border-muted-foreground/30 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Place
                    </Button>
                  </div>
                </div>

                <div className="space-y-4 pl-20">
                  {rating.address && (
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground/70" />
                      <span className="leading-relaxed">{rating.address}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    {rating.date_visited && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Visited {format(new Date(rating.date_visited), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                    {rating.website && (
                      <a 
                        href={rating.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Website</span>
                      </a>
                    )}
                    {rating.phone_number && (
                      <a 
                        href={`tel:${rating.phone_number}`}
                        className="flex items-center gap-2 text-green-600 hover:text-green-800 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  {rating.category_ratings && Object.keys(rating.category_ratings).length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-foreground">Category Ratings</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(rating.category_ratings).map(([category, score]) => (
                          <div key={category} className="flex items-center justify-between bg-muted/30 px-4 py-3 rounded-lg">
                            <span className="text-sm font-medium text-muted-foreground">{category}</span>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.floor((score as number) / 2)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-sm font-medium text-muted-foreground">
                                {score as number}/10
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rating.notes && rating.notes.trim() && (
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-foreground">Notes</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 p-4 rounded-lg">
                        {rating.notes}
                      </p>
                    </div>
                  )}

                  {rating.photos && rating.photos.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-base font-semibold text-foreground">Photos</h4>
                      <div className="grid grid-cols-3 gap-3">
                        {rating.photos.slice(0, 6).map((photo, index) => (
                          <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted shadow-sm">
                            <img
                              src={photo}
                              alt={`${rating.place_name} photo ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(photo, '_blank');
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
import React from 'react';
import { Star, MapPin, Calendar, Globe, Phone, Clock, DollarSign, Edit, X, Navigation, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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

interface PlaceDetailsModalProps {
  place: PlaceRating | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: (placeId: string) => void;
}

export function PlaceDetailsModal({ place, isOpen, onClose, onEdit, onDelete }: PlaceDetailsModalProps) {
  if (!place) return null;

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
          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {halfStar && <Star className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-gray-300" />
        ))}
        <span className="ml-2 text-sm font-medium">{rating}/10</span>
      </div>
    );
  };

  const getDirectionsUrl = () => {
    if (place.latitude && place.longitude) {
      // Use coordinates for more accurate directions
      return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
    } else if (place.address) {
      // Fall back to address
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place.address)}`;
    } else {
      // Search for the place name as last resort
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place_name)}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getPlaceIcon(place.place_type)}</span>
              <div>
                <DialogTitle className="text-xl font-bold">{place.place_name}</DialogTitle>
                <Badge variant="secondary" className="mt-1">
                  {place.place_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    onClose();
                    onDelete(place.id);
                  }}
                  className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Rating Section */}
          {place.overall_rating && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Overall Rating
                </h3>
                {renderStarRating(place.overall_rating)}
              </CardContent>
            </Card>
          )}

          {/* Category Ratings */}
          {place.category_ratings && Object.keys(place.category_ratings).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Category Ratings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(place.category_ratings).map(([category, score]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{category}</span>
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
              </CardContent>
            </Card>
          )}

          {/* Location & Details */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold mb-3">Details</h3>
              
              {place.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{place.address}</span>
                </div>
              )}

              {place.date_visited && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Visited on {format(new Date(place.date_visited), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}

              {place.price_range && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Price Range: {getPriceDisplay(place.price_range)}
                  </span>
                </div>
              )}

              {place.website && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full justify-start gap-3 h-10 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 text-blue-700 hover:text-blue-800"
                  >
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                    </a>
                  </Button>
                </div>
              )}

              {place.phone_number && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full justify-start gap-3 h-10 border-orange-200 bg-orange-50 hover:bg-orange-100 hover:border-orange-300 text-orange-700 hover:text-orange-800"
                  >
                    <a
                      href={`tel:${place.phone_number}`}
                    >
                      <Phone className="w-4 h-4" />
                      Call {place.phone_number}
                    </a>
                  </Button>
                </div>
              )}

              {/* Directions Button */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="w-full justify-start gap-3 h-10 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 text-green-700 hover:text-green-800"
                >
                  <a
                    href={getDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="w-4 h-4" />
                    Get Directions
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {place.notes && place.notes.trim() && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {place.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {place.photos && place.photos.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  📸 Photos ({place.photos.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {place.photos.map((photo, index) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={photo}
                        alt={`${place.place_name} photo ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(photo, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
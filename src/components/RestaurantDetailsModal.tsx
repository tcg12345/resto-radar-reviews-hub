import { Heart, MapPin, Star, Globe, Phone, ExternalLink, Clock, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { ReservationWidget } from '@/components/ReservationWidget';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount?: number;
  priceRange: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  photos: string[];
  location: {
    lat: number;
    lng: number;
  };
  cuisine?: string;
  googleMapsUrl?: string;
}

interface RestaurantDetailsModalProps {
  restaurant: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveToWishlist?: (restaurant: Restaurant) => void;
}

export function RestaurantDetailsModal({ 
  restaurant, 
  isOpen, 
  onClose, 
  onSaveToWishlist 
}: RestaurantDetailsModalProps) {
  if (!restaurant) return null;

  const getPriceDisplay = (range: number) => '$'.repeat(Math.min(range, 4));

  const handleSaveToWishlist = () => {
    if (onSaveToWishlist) {
      onSaveToWishlist(restaurant);
      toast.success(`${restaurant.name} saved to wishlist!`);
    }
  };

  const handleCallPhone = () => {
    if (restaurant.phoneNumber) {
      window.open(`tel:${restaurant.phoneNumber}`, '_self');
    }
  };

  const handleVisitWebsite = () => {
    if (restaurant.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  const handleViewOnMaps = () => {
    const mapsUrl = restaurant.googleMapsUrl || 
      `https://www.google.com/maps/search/${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
    window.open(mapsUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl font-bold">{restaurant.name}</span>
            {onSaveToWishlist && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToWishlist}
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Save to Wishlist
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Photo Gallery */}
          {restaurant.photos.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <div className="aspect-video overflow-hidden rounded-lg">
                  <img
                    src={restaurant.photos[0]}
                    alt={restaurant.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                {restaurant.photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {restaurant.photos.slice(1, 4).map((photo, index) => (
                      <div key={index} className="aspect-square overflow-hidden rounded-lg">
                        <img
                          src={photo}
                          alt={`${restaurant.name} photo ${index + 2}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <a 
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-semibold hover:underline">{restaurant.rating}</span>
                </a>
                {restaurant.reviewCount && (
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    ({restaurant.reviewCount.toLocaleString()} reviews)
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {restaurant.isOpen !== undefined && (
                  <Badge variant={restaurant.isOpen ? "default" : "secondary"}>
                    {restaurant.isOpen ? "Open" : "Closed"}
                  </Badge>
                )}
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold text-green-600">
                    {getPriceDisplay(restaurant.priceRange)}
                  </span>
                </div>
              </div>
            </div>

            {restaurant.cuisine && (
              <Badge variant="outline" className="text-sm">
                {restaurant.cuisine}
              </Badge>
            )}

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span className="text-sm">{restaurant.address}</span>
            </div>
          </div>


          {/* Opening Hours */}
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <OpeningHoursDisplay hours={restaurant.openingHours} />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {restaurant.phoneNumber && (
              <Button
                variant="outline"
                onClick={handleCallPhone}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            )}

            {restaurant.website && (
              <Button
                variant="outline"
                onClick={handleVisitWebsite}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Website
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleViewOnMaps}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View on Maps
            </Button>
          </div>

          <Separator />

          {/* Reservation Widget */}
          <ReservationWidget 
            restaurant={{
              id: restaurant.id,
              name: restaurant.name,
              phone_number: restaurant.phoneNumber,
              website: restaurant.website
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
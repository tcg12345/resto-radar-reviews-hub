import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Globe, Phone, Clock, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MenuButton } from '@/components/MenuButton';

interface SharedRestaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country?: string;
  cuisine: string;
  rating?: number;
  priceRange?: number;
  michelinStars?: number;
  photos?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
  openingHours?: string;
  reservable?: boolean;
  reservationUrl?: string;
}

interface RestaurantDetailsModalProps {
  restaurant: SharedRestaurant;
  isOpen: boolean;
  onClose: () => void;
  canAddToWishlist: boolean;
}

export function SharedRestaurantDetailsModal({ 
  restaurant, 
  isOpen, 
  onClose, 
  canAddToWishlist 
}: RestaurantDetailsModalProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const getPriceRangeDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  const addToWishlist = async () => {
    if (!user || !restaurant) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .insert({
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          country: restaurant.country,
          cuisine: restaurant.cuisine,
          price_range: restaurant.priceRange,
          michelin_stars: restaurant.michelinStars,
          photos: restaurant.photos || [],
          notes: restaurant.notes,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          website: restaurant.website,
          phone_number: restaurant.phone_number,
          opening_hours: restaurant.openingHours,
          reservable: restaurant.reservable || false,
          reservation_url: restaurant.reservationUrl,
          is_wishlist: true,
          user_id: user.id
        });

      if (error) {
        console.error('Error adding to wishlist:', error);
        toast('Failed to add to wishlist');
        return;
      }

      setIsAdded(true);
      toast('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast('Failed to add to wishlist');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{restaurant.name}</span>
            {canAddToWishlist && (
              <Button
                onClick={addToWishlist}
                disabled={isAdding || isAdded}
                size="sm"
                variant={isAdded ? "outline" : "default"}
              >
                {isAdded ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Added
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    {isAdding ? 'Adding...' : 'Add to Wishlist'}
                  </>
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rating and Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {restaurant.rating && (
              <Badge variant="secondary">
                <Star className="h-3 w-3 mr-1" />
                {restaurant.rating}/10
              </Badge>
            )}
            {restaurant.michelinStars && (
              <Badge variant="outline">
                {'⭐'.repeat(restaurant.michelinStars)} Michelin
              </Badge>
            )}
            {restaurant.priceRange && (
              <Badge variant="outline">
                {getPriceRangeDisplay(restaurant.priceRange)}
              </Badge>
            )}
            <Badge variant="secondary">{restaurant.cuisine}</Badge>
          </div>

          <Separator />

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">Address</p>
              <p className="text-sm text-muted-foreground">
                {restaurant.address}
                <br />
                {restaurant.city}
                {restaurant.country && `, ${restaurant.country}`}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          {(restaurant.phone_number || restaurant.website) && (
            <>
              <Separator />
              <div className="space-y-3">
                {restaurant.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a 
                        href={`tel:${restaurant.phone_number}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {restaurant.phone_number}
                      </a>
                    </div>
                  </div>
                )}
                
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Website</p>
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Menu Button */}
              <div className="pt-2">
                <MenuButton 
                  restaurantName={restaurant.name}
                  restaurantAddress={restaurant.address}
                  className="w-full"
                  size="default"
                />
              </div>
            </>
          )}

          {/* Opening Hours */}
          {restaurant.openingHours && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="font-medium">Opening Hours</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {restaurant.openingHours}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {restaurant.notes && (
            <>
              <Separator />
              <div>
                <p className="font-medium mb-2">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {restaurant.notes}
                </p>
              </div>
            </>
          )}

          {/* Reservation */}
          {restaurant.reservable && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-medium">Reservations Available</p>
                {restaurant.reservationUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={restaurant.reservationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Make Reservation
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
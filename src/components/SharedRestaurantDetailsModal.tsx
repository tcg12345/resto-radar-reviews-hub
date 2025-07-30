import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';

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
  sharedBy?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
  isWishlist?: boolean;
}

interface SharedRestaurantDetailsModalProps {
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
}: SharedRestaurantDetailsModalProps) {
  if (!restaurant) return null;

  // Transform shared restaurant data to unified format
  const unifiedRestaurant = {
    id: restaurant.id,
    name: restaurant.name,
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    priceRange: restaurant.priceRange,
    michelinStars: restaurant.michelinStars,
    photos: restaurant.photos,
    notes: restaurant.notes,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    website: restaurant.website,
    phone_number: restaurant.phone_number,
    openingHours: restaurant.openingHours,
    reservable: restaurant.reservable,
    reservationUrl: restaurant.reservationUrl,
    isSharedRestaurant: !!restaurant.sharedBy,
    sharedBy: restaurant.sharedBy,
    isWishlist: restaurant.isWishlist,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <UnifiedRestaurantDetails
          restaurant={unifiedRestaurant}
          onBack={onClose}
          showBackButton={false}
          canAddToWishlist={canAddToWishlist}
        />
      </DialogContent>
    </Dialog>
  );
}
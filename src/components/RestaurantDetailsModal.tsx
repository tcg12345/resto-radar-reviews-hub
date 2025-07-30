import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';

interface RestaurantDetailsModalProps {
  restaurant: any;
  isOpen: boolean;
  onClose: () => void;
  onSaveToWishlist?: () => void;
  canAddToWishlist?: boolean;
}

export function RestaurantDetailsModal({ 
  restaurant, 
  isOpen, 
  onClose, 
  onSaveToWishlist,
  canAddToWishlist = true 
}: RestaurantDetailsModalProps) {
  if (!restaurant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <UnifiedRestaurantDetails
          restaurant={restaurant}
          onBack={onClose}
          showBackButton={false}
          onToggleWishlist={onSaveToWishlist}
          canAddToWishlist={canAddToWishlist}
        />
      </DialogContent>
    </Dialog>
  );
}
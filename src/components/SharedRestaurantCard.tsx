import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Plus } from 'lucide-react';
import { SharedRestaurantDetailsModal } from './SharedRestaurantDetailsModal';

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

interface SharedRestaurantCardProps {
  restaurantData: string;
  isOwnMessage: boolean;
}

export function SharedRestaurantCard({ restaurantData, isOwnMessage }: SharedRestaurantCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  let restaurant: SharedRestaurant;
  try {
    restaurant = JSON.parse(restaurantData);
  } catch (error) {
    console.error('Failed to parse restaurant data:', error);
    return (
      <div className="text-sm text-muted-foreground italic">
        Invalid restaurant data
      </div>
    );
  }

  const getPriceRangeDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  return (
    <>
      <Card 
        className={`cursor-pointer hover:shadow-md transition-all duration-200 max-w-sm ${
          isOwnMessage ? 'bg-primary/10 border-primary/20' : ''
        }`}
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{restaurant.name}</h4>
              <div className="flex items-center gap-2 mb-2">
                {restaurant.rating && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {restaurant.rating}/10
                  </Badge>
                )}
                {restaurant.michelinStars && (
                  <Badge variant="outline" className="text-xs">
                    {'⭐'.repeat(restaurant.michelinStars)}
                  </Badge>
                )}
                {restaurant.priceRange && (
                  <Badge variant="outline" className="text-xs">
                    {getPriceRangeDisplay(restaurant.priceRange)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {restaurant.cuisine}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {restaurant.address}, {restaurant.city}
                {restaurant.country && `, ${restaurant.country}`}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              Click to view details
            </span>
            {!isOwnMessage && (
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <SharedRestaurantDetailsModal 
        restaurant={restaurant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        canAddToWishlist={!isOwnMessage}
      />
    </>
  );
}
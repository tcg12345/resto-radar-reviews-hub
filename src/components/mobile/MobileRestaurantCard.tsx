import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Clock, Eye, Share2, Trash2, ExternalLink, Phone, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PhotoGallery } from '@/components/PhotoGallery';
import { ShareRestaurantDialog } from '@/components/ShareRestaurantDialog';
import { BottomSheet, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { Restaurant } from '@/types/restaurant';
import { resolveImageUrl } from '@/utils/imageUtils';
import { getStateFromCoordinatesCached } from '@/utils/geocoding';

interface MobileRestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Component for displaying location with geocoding
function LocationDisplay({
  restaurant
}: {
  restaurant: Restaurant;
}) {
  const [locationText, setLocationText] = useState<string>('');
  useEffect(() => {
    async function determineLocation() {
      if (restaurant.country === 'United States' && restaurant.latitude && restaurant.longitude) {
        try {
          const state = await getStateFromCoordinatesCached(restaurant.latitude, restaurant.longitude);
          setLocationText(state ? `${restaurant.city}, ${state}` : `${restaurant.city}, United States`);
        } catch (error) {
          console.error('Error getting state:', error);
          setLocationText(`${restaurant.city}, United States`);
        }
      } else {
        setLocationText(`${restaurant.city}${restaurant.country ? `, ${restaurant.country}` : ''}`);
      }
    }
    determineLocation();
  }, [restaurant.city, restaurant.country, restaurant.latitude, restaurant.longitude]);

  const displayText = locationText || `${restaurant.city}${restaurant.country ? `, ${restaurant.country}` : ''}`;
  return <span>{displayText}</span>;
}

// Helper function to get current day's hours
const getCurrentDayHours = (hours: string) => {
  if (!hours) return 'Hours not available';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long'
  });
  if (hours.includes('Call for hours') || hours.includes('Hours vary')) {
    return 'Call for hours';
  }
  const lines = hours.split('\n');
  const todayLine = lines.find(line => line.toLowerCase().includes(today.toLowerCase()));
  return todayLine || hours.split('\n')[0] || hours;
};

export function MobileRestaurantCard({
  restaurant,
  onEdit,
  onDelete
}: MobileRestaurantCardProps) {
  const navigate = useNavigate();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isActionsSheetOpen, setIsActionsSheetOpen] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const photos = restaurant.photos || [];
  const coverPhoto = photos[0];

  const handleOpenWebsite = () => {
    if (restaurant.website) {
      window.open(restaurant.website, '_blank');
    }
    setIsActionsSheetOpen(false);
  };

  const handleCallPhone = () => {
    if (restaurant.phone_number) {
      window.open(`tel:${restaurant.phone_number}`, '_blank');
    }
    setIsActionsSheetOpen(false);
  };

  const handleViewDetails = () => {
    const preview = {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      country: restaurant.country,
      cuisine: restaurant.cuisine,
      rating: restaurant.rating,
      price_range: restaurant.priceRange,
      michelin_stars: restaurant.michelinStars,
      notes: restaurant.notes,
      photos: restaurant.photos,
      website: restaurant.website,
      phone_number: restaurant.phone_number,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      reservable: (restaurant as any).reservable,
      reservation_url: (restaurant as any).reservationUrl,
      opening_hours: restaurant.openingHours,
      date_visited: restaurant.dateVisited,
      user_id: restaurant.userId,
      is_wishlist: restaurant.isWishlist,
    };
    navigate(`/restaurant/${restaurant.id}`, { 
      state: { 
        restaurantPreview: preview, 
        returnUrl: encodeURIComponent(window.location.pathname) 
      } 
    });
    setIsActionsSheetOpen(false);
  };

  const handleShare = () => {
    setIsActionsSheetOpen(false);
    setIsShareDialogOpen(true);
  };

  const handleEdit = () => {
    setIsActionsSheetOpen(false);
    onEdit?.(restaurant.id);
  };

  const handleDelete = () => {
    setIsActionsSheetOpen(false);
    onDelete?.(restaurant.id);
  };

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setIsActionsSheetOpen(true);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleClick = () => {
    if (!longPressTimer) {
      handleViewDetails();
    }
  };

  return (
    <>
      <Card 
        className="w-full overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex">
          {/* Photo Section */}
          {coverPhoto && (
            <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-muted">
              <img
                src={resolveImageUrl(coverPhoto, { width: 200 })}
                alt={`${restaurant.name} photo`}
                className="w-full h-full object-cover"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsGalleryOpen(true);
                }}
              />
            </div>
          )}
          
          {/* Content Section */}
          <div className="flex-1 min-w-0">
            <CardHeader className="pb-2 p-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold line-clamp-1 pr-2">
                  {restaurant.name}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsActionsSheetOpen(true);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Rating and Michelin */}
              <div className="flex items-center gap-2">
                {restaurant.rating !== undefined && (
                  <div className="flex items-center">
                    <StarRating rating={restaurant.rating} readonly size="sm" />
                    {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({restaurant.reviewCount.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
                {restaurant.michelinStars && (
                  <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 p-3">
              {/* Price and Cuisine */}
              <div className="flex items-center text-sm mb-2">
                {restaurant.priceRange && (
                  <>
                    <span className="text-green-600 font-medium">
                      {'$'.repeat(restaurant.priceRange)}
                    </span>
                    <span className="text-muted-foreground mx-1">•</span>
                  </>
                )}
                <span className="text-foreground line-clamp-1">{restaurant.cuisine}</span>
              </div>
              
              {/* Location */}
              <div className="flex items-center text-xs text-muted-foreground mb-1">
                <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">
                  <LocationDisplay restaurant={restaurant} />
                </span>
              </div>
              
              {/* Hours */}
              {restaurant.openingHours && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="mr-1 h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">
                    {getCurrentDayHours(restaurant.openingHours)}
                  </span>
                </div>
              )}
              
              {/* Date Visited */}
              {restaurant.dateVisited && (
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <Clock className="mr-1 h-2.5 w-2.5" />
                    {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      {/* Photo Gallery */}
      <PhotoGallery 
        photos={photos} 
        photoCaptions={restaurant.photoDishNames || []} 
        initialIndex={0} 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        restaurantName={restaurant.name} 
        isMobile={true}
      />

      {/* Actions Bottom Sheet */}
      <BottomSheet open={isActionsSheetOpen} onOpenChange={setIsActionsSheetOpen}>
        <BottomSheetHeader>
          <h3 className="text-lg font-semibold">{restaurant.name}</h3>
        </BottomSheetHeader>
        <BottomSheetContent>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={handleViewDetails}
            >
              <Eye className="mr-3 h-4 w-4" />
              View Details
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={handleShare}
            >
              <Share2 className="mr-3 h-4 w-4" />
              Share
            </Button>
            
            {restaurant.website && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={handleOpenWebsite}
              >
                <ExternalLink className="mr-3 h-4 w-4" />
                Visit Website
              </Button>
            )}
            
            {restaurant.phone_number && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={handleCallPhone}
              >
                <Phone className="mr-3 h-4 w-4" />
                Call Restaurant
              </Button>
            )}
            
            {onEdit && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12"
                onClick={handleEdit}
              >
                <Eye className="mr-3 h-4 w-4" />
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="ghost"
                className="w-full justify-start h-12 text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-3 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </BottomSheetContent>
      </BottomSheet>

      {/* Share Restaurant Dialog */}
      <ShareRestaurantDialog 
        restaurant={restaurant} 
        isOpen={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen} 
      />
    </>
  );
}
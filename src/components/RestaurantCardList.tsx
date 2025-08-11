import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { format } from 'date-fns';
import { MapPin, Clock, Edit2, Trash2, Eye, Share2, Phone, Globe, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { PhotoGallery } from '@/components/PhotoGallery';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { ShareRestaurantDialog } from '@/components/ShareRestaurantDialog';
import { Restaurant } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { getStateFromCoordinatesCached } from '@/utils/geocoding';
import { LazyImage } from '@/components/LazyImage';
interface RestaurantCardListProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Component for displaying location with geocoding
function LocationDisplay({ restaurant }: { restaurant: Restaurant }) {
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

export function RestaurantCardList({ restaurant, onEdit, onDelete }: RestaurantCardListProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { loadRestaurantPhotos } = useRestaurants();

  // Don't load photos immediately - let them be loaded lazily when needed
  // This prevents every card from making a separate database request on page load

  const openGallery = () => {
    setIsGalleryOpen(true);
  };

  const handleOpenWebsite = () => {
    if (restaurant.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  const handleCallPhone = () => {
    if (restaurant.phone_number) {
      window.open(`tel:${restaurant.phone_number}`, '_blank');
    }
  };
  
  const handleCardClick = () => {
    navigate(`/restaurant/${restaurant.id}`);
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <>
      <PhotoGallery 
        photos={restaurant.photos} 
        photoCaptions={restaurant.photoDishNames || []}
        initialIndex={currentPhotoIndex} 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        restaurantName={restaurant.name}
        isMobile={isMobile}
      />
      
      <Card className="overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer" onClick={handleCardClick}>
        <div className={isMobile ? "block" : "flex"}>
          {!isMobile && restaurant.photos.length > 0 && (
            <div className="w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0 relative overflow-hidden" onClick={openGallery}>
              <LazyImage 
                src={restaurant.photos[currentPhotoIndex]}
                alt={`${restaurant.name} photo`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
              />
            </div>
          )}

          {/* Content section */}
          <div className="flex-1 flex flex-col">
            <CardHeader className={`${isMobile ? "py-2 px-3" : "pb-3 p-3 lg:p-4"}`}>
              <div className={`${isMobile ? "flex items-center justify-between" : "flex justify-between items-start"}`}>
                <div className="flex-1">
                  <CardTitle className={`font-bold line-clamp-1 ${isMobile ? "text-base mb-1" : "text-base lg:text-lg"}`}>
                    {restaurant.name}
                  </CardTitle>
                  
                  <div className={`flex items-center gap-3 ${isMobile ? "mb-1" : "mb-2"}`}>
                    {/* Compact rating for mobile */}
                    {restaurant.rating !== undefined && (
                      <div className="flex items-center gap-1">
                        {isMobile ? (
                          <>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-foreground text-sm">
                              {restaurant.rating}
                            </span>
                          </>
                        ) : (
                          <>
                            <StarRating rating={restaurant.rating} readonly size="sm" />
                            <span className="font-semibold text-foreground text-sm">
                              {restaurant.rating}/10
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    
                    {/* Michelin stars - inline for mobile */}
                    {restaurant.michelinStars && (
                      <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
                    )}
                    
                    {/* Price and cuisine - inline for mobile */}
                    <div className="flex items-center gap-1 text-xs">
                      {restaurant.priceRange && (
                        <>
                          <span className="text-green-600 font-semibold">
                            {'$'.repeat(restaurant.priceRange)}
                          </span>
                          <span className="text-muted-foreground">•</span>
                        </>
                      )}
                      <span className="text-foreground font-medium truncate">{restaurant.cuisine}</span>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons - improved mobile layout */}
                {!isMobile && (
                  <div className="flex gap-1 ml-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-xs" 
                      onClick={(e) => handleButtonClick(e, () => setIsShareDialogOpen(true))}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    
                    {onDelete && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" 
                        onClick={(e) => handleButtonClick(e, () => onDelete(restaurant.id))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            {!isMobile && (
              <CardContent className="pt-0 flex-1 flex flex-col justify-between p-3 lg:p-4">
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground text-xs">
                    <MapPin className="mr-2 flex-shrink-0 h-3 w-3" />
                    <LocationDisplay restaurant={restaurant} />
                  </div>
                  
                  {restaurant.openingHours && (
                    <div className="flex items-center text-muted-foreground text-xs">
                      <Clock className="mr-2 flex-shrink-0 h-3 w-3" />
                      <span className="line-clamp-1">
                        {restaurant.openingHours.split('\n')[0]}
                      </span>
                    </div>
                  )}
                  
                  {restaurant.dateVisited && (
                    <div className="text-muted-foreground text-xs">
                      Visited: {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
                    </div>
                  )}
                  
                  {restaurant.isWishlist && (
                    <div className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-accent text-xs">
                      Wishlist
                    </div>
                  )}
                </div>
              </CardContent>
            )}
            
            {/* Mobile simplified content */}
            {isMobile && (
              <CardContent className="pt-0 px-3 pb-2">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 px-2" 
                    onClick={(e) => handleButtonClick(e, () => setIsShareDialogOpen(true))}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  
                  {onDelete && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-destructive hover:bg-destructive/10" 
                      onClick={(e) => handleButtonClick(e, () => onDelete(restaurant.id))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </div>
        </div>
      </Card>
      
      <ShareRestaurantDialog 
        restaurant={restaurant} 
        isOpen={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen} 
      />
    </>
  );
}
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

// Image URL resolution
import { resolveImageUrl, getLqipUrl } from '@/utils/imageUtils';

interface RestaurantCardListProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RestaurantCardList({ restaurant, onEdit, onDelete }: RestaurantCardListProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { loadRestaurantPhotos } = useRestaurants();

  // Ensure photos exist for cover
  useEffect(() => {
    if (restaurant.photos.length === 0) {
      loadRestaurantPhotos(restaurant.id).catch((e) => console.warn('Photo load failed', e));
    }
  }, [restaurant.id, restaurant.photos.length, loadRestaurantPhotos]);

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
      
      <Card className="overflow-hidden border-0 shadow-[0_6px_25px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all duration-300 rounded-2xl cursor-pointer group" style={{backgroundColor: 'rgb(13,23,42)'}} onClick={handleCardClick}>
        <div className={isMobile ? "block" : "flex"}>
          {!isMobile && restaurant.photos.length > 0 && (
            <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden rounded-l-2xl" onClick={openGallery}>
              <LazyImage 
                src={resolveImageUrl(restaurant.photos[currentPhotoIndex], { width: 400 })}
                placeholderSrc={getLqipUrl(restaurant.photos[currentPhotoIndex])}
                alt={`${restaurant.name} photo`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] cursor-pointer"
              />
            </div>
          )}

          {/* Minimal Content section */}
          <div className="flex-1 flex flex-col justify-between">
            <div className={`${isMobile ? "py-2.5 px-3" : "py-2.5 px-4"}`}>
              {/* Name and Rating Row */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <CardTitle className={`font-bold truncate ${isMobile ? "text-base" : "text-lg"}`}>
                  {restaurant.name}
                </CardTitle>
                
                {/* Star Rating */}
                {restaurant.rating !== undefined && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="text-amber-400 text-sm">★</div>
                    <span className="text-sm font-bold text-foreground">
                      {restaurant.rating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Single Info Row: Cuisine • Price • City • Michelin */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                  <span className="font-medium text-foreground truncate">{restaurant.cuisine}</span>
                  
                  {restaurant.priceRange && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {'$'.repeat(restaurant.priceRange)}
                      </span>
                    </>
                  )}
                  
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {restaurant.city}
                  </span>
                  
                  {/* Michelin Stars inline */}
                  {restaurant.michelinStars && (
                    <div className="flex items-center ml-1">
                      <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
                    </div>
                  )}
                </div>
                
                {/* Wishlist indicator only (no date visited) */}
                {restaurant.isWishlist && (
                  <div className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 flex-shrink-0">
                    Saved
                  </div>
                )}
              </div>
            </div>
            
            {/* Subtle Actions Row */}
            <div className="flex justify-between items-center gap-1 px-4 pb-2">
              <span className="text-xs text-muted-foreground truncate">{restaurant.city}</span>
              <div className="flex items-center gap-1">
                <Button 
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full hover:bg-muted/30 transition-all duration-200 shadow-none opacity-60 hover:opacity-100"
                  onClick={(e) => handleButtonClick(e, () => setIsShareDialogOpen(true))}
                >
                  <Share2 className="h-3 w-3 text-muted-foreground" />
                </Button>
                
                {onDelete && (
                  <Button 
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all duration-200 shadow-none opacity-60 hover:opacity-100"
                    onClick={(e) => handleButtonClick(e, () => onDelete(restaurant.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
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
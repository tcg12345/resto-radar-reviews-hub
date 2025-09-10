import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useInstantImageCache, useOnDemandImageLoader } from '@/hooks/useInstantImageCache';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2, Eye, Bot, ExternalLink, Phone, Globe, Share2, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { WeightedRating } from '@/components/WeightedRating';
import { PhotoGallery } from '@/components/PhotoGallery';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { AIReviewAssistant } from '@/components/AIReviewAssistant';
import { ShareRestaurantDialog } from '@/components/ShareRestaurantDialog';
import { Restaurant } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { getStateFromCoordinatesCached } from '@/utils/geocoding';
import { supabase } from '@/integrations/supabase/client';

// Image URL resolution
import { resolveImageUrl, getLqipUrl } from '@/utils/imageUtils';
interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClose?: () => void;
  showAIReviewAssistant?: boolean;
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

  // Show immediate fallback while loading
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
  // Extract today's hours if format includes daily breakdown
  const lines = hours.split('\n');
  const todayLine = lines.find(line => line.toLowerCase().includes(today.toLowerCase()));
  return todayLine || hours.split('\n')[0] || hours;
};
export function RestaurantCard({
  restaurant,
  onEdit,
  onDelete,
  onClose,
  showAIReviewAssistant = false
}: RestaurantCardProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [prefetched, setPrefetched] = useState(false);
  const {
    loadRestaurantPhotos
  } = useRestaurants();
  const photos = restaurant.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  // Only preload first photo for instant display
  useInstantImageCache(photos, 1);
  const {
    loadImage
  } = useOnDemandImageLoader();

  // Optimized loading - minimal delay for better perceived performance
  useEffect(() => {
    const initializeCard = () => {
      setIsDataReady(true);
      setImageLoading(false);
    };

    // Proactively load photos if missing
    if (photos.length === 0) {
      loadRestaurantPhotos(restaurant.id).catch(e => console.warn('Photo load failed', e));
    }

    // Initialize immediately for better performance
    initializeCard();
  }, [restaurant.id]); // Remove loadRestaurantPhotos from dependencies to prevent infinite loop
  const nextPhoto = () => {
    setImageLoading(true);
    const nextIndex = (currentPhotoIndex + 1) % photos.length;
    setCurrentPhotoIndex(nextIndex);
    // Preload next photo on demand
    loadImage(photos[nextIndex]);
  };
  const previousPhoto = () => {
    setImageLoading(true);
    const prevIndex = currentPhotoIndex === 0 ? photos.length - 1 : currentPhotoIndex - 1;
    setCurrentPhotoIndex(prevIndex);
    // Preload previous photo on demand
    loadImage(photos[prevIndex]);
  };
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
  const handlePrefetch = async () => {
    if (prefetched) return;
    setPrefetched(true);
    try {
      // Warm community stats (by name fallback)
      await supabase.functions.invoke('community-reviews', {
        body: {
          restaurant_name: restaurant.name
        }
      });
      // Warm DB for details fetch (lightweight select)
      await supabase.from('restaurants').select('id,name,address,city,country,cuisine,rating,price_range,michelin_stars,website,phone_number,opening_hours,latitude,longitude,is_wishlist,created_at,updated_at,user_id').eq('id', restaurant.id).limit(1);
    } catch (e) {
      // Silent prefetch errors
    }
  };
  // Show skeleton until all data is ready
  if (!isDataReady) {
    return <Card className="overflow-hidden">
        <Skeleton className="h-48 w-full" />
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>;
  }
  return <>
      <PhotoGallery photos={photos} photoCaptions={restaurant.photoDishNames || []} initialIndex={currentPhotoIndex} isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} restaurantName={restaurant.name} isMobile={isMobile} />
      <Card className="overflow-hidden bg-white dark:bg-gray-900/50 border border-gray-200/60 dark:border-gray-700/40 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-300 rounded-2xl flex flex-col h-full group backdrop-blur-sm">
        {/* Hero Restaurant Image */}
        {photos.length > 0 && <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <img 
              src={resolveImageUrl(photos[currentPhotoIndex], { width: 600 })} 
              alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`} 
              className="h-full w-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-[1.02]" 
              onLoad={() => setImageLoading(false)} 
              onError={() => setImageLoading(false)} 
              loading="lazy" 
            />
            
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/5" />
            
            {/* Gallery Click Area */}
            <div className="absolute inset-0 cursor-pointer" onClick={openGallery} />
            
            {/* Wishlist Heart Icon - Top Right */}
            {restaurant.isWishlist && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
            )}
            
            {/* Minimal Carousel Indicators */}
            {hasMultiplePhotos && (
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1">
                {photos.slice(0, 5).map((_, index) => (
                  <button 
                    key={index} 
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      index === currentPhotoIndex 
                        ? 'bg-white scale-125 shadow-sm' 
                        : 'bg-white/60 hover:bg-white/80'
                    }`} 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentPhotoIndex(index);
                      loadImage(photos[index]);
                    }} 
                  />
                ))}
                {photos.length > 5 && (
                  <span className="text-white/80 text-xs font-medium ml-1">+{photos.length - 5}</span>
                )}
              </div>
            )}

            {/* Subtle Navigation Arrows */}
            {hasMultiplePhotos && (
              <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 transition-all duration-200 hover:scale-105" 
                  onClick={(e) => {
                    e.stopPropagation();
                    previousPhoto();
                  }}
                >
                  <span className="text-white text-sm">‹</span>
                </Button>
                
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 transition-all duration-200 hover:scale-105" 
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                >
                  <span className="text-white text-sm">›</span>
                </Button>
              </div>
            )}

            {/* Edit button */}
            {onEdit && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 transition-all duration-200 hover:scale-105" 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(restaurant.id);
                }}
              >
                <Edit2 className="h-4 w-4 text-white" />
              </Button>
            )}

            {/* Close button */}
            {onClose && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-3 right-12 h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border-0 transition-all duration-200 hover:scale-105" 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>}
        
        {/* Premium Content Layout */}
        <div className="relative flex flex-col flex-1 p-6 space-y-4 bg-white dark:bg-gray-900/50">
          {/* Close button for no-photos layout */}
          {!photos.length && onClose && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200" 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </Button>
          )}

          {/* Restaurant Name - Hero */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight">
              {restaurant.name}
            </h3>

            {/* Category, Price & Rating Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  {restaurant.cuisine}
                </span>
                
                {restaurant.priceRange && (
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">
                      {'$'.repeat(restaurant.priceRange)}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Star Rating */}
              {restaurant.rating !== undefined && (
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {restaurant.rating.toFixed(1)}
                  </span>
                  {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({restaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Michelin Stars */}
            {restaurant.michelinStars && (
              <div className="flex items-center">
                <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
              </div>
            )}
          </div>

          {/* Location & Hours */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
              <LocationDisplay restaurant={restaurant} />
            </div>

            {restaurant.openingHours && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                <span>{getCurrentDayHours(restaurant.openingHours)}</span>
              </div>
            )}
          </div>

          {/* Status Tags */}
          {(restaurant.dateVisited || restaurant.isWishlist) && (
            <div className="flex items-center gap-2">
              {restaurant.dateVisited && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  <span>{format(new Date(restaurant.dateVisited), 'MMM d')}</span>
                </div>
              )}
              
              {restaurant.isWishlist && (
                <div className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Saved
                </div>
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-9 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-0 transition-all duration-200 hover:scale-105 font-medium text-sm" 
              onMouseEnter={handlePrefetch} 
              onFocus={handlePrefetch} 
              onTouchStart={handlePrefetch} 
              onClick={() => {
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
                  is_wishlist: restaurant.isWishlist
                };
                navigate(`/restaurant/${restaurant.id}`, {
                  state: {
                    restaurantPreview: preview,
                    returnUrl: encodeURIComponent(window.location.pathname)
                  }
                });
              }}
            >
              View Details
            </Button>
            
            <div className="flex items-center gap-1">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200" 
                onClick={() => setIsShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 text-gray-500 dark:text-gray-400" strokeWidth={1.5} />
              </Button>
              
              {onDelete && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-all duration-200" 
                  onClick={() => onDelete(restaurant.id)}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              )}
            </div>
          </div>
        </div>
     </Card>
     
     {/* AI Review Assistant Dialog */}
     {showAIReviewAssistant && <Dialog open={isAIReviewOpen} onOpenChange={setIsAIReviewOpen}>
         <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>AI Review Assistant - {restaurant.name}</DialogTitle>
           </DialogHeader>
           <AIReviewAssistant restaurantName={restaurant.name} cuisine={restaurant.cuisine} rating={restaurant.rating} priceRange={restaurant.priceRange} currentReview={restaurant.notes} onReviewUpdate={review => {
          // This is just for viewing, not editing, so we'll show a message
          navigator.clipboard.writeText(review);
          // You could add a toast here to show it was copied
        }} />
         </DialogContent>
        </Dialog>}
      
      {/* Share Restaurant Dialog */}
      <ShareRestaurantDialog restaurant={restaurant} isOpen={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} />
     </>;
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useInstantImageCache, useOnDemandImageLoader } from '@/hooks/useInstantImageCache';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2, Eye, Bot, ExternalLink, Phone, Globe, Share2 } from 'lucide-react';
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
  const { loadImage } = useOnDemandImageLoader();

  // Optimized loading - minimal delay for better perceived performance
  useEffect(() => {
    const initializeCard = () => {
      setIsDataReady(true);
      setImageLoading(false);
    };
    
    // Proactively load photos if missing
    if (photos.length === 0) {
      loadRestaurantPhotos(restaurant.id).catch((e) => console.warn('Photo load failed', e));
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
        body: { restaurant_name: restaurant.name }
      });
      // Warm DB for details fetch (lightweight select)
      await supabase.from('restaurants')
        .select('id,name,address,city,country,cuisine,rating,price_range,michelin_stars,website,phone_number,opening_hours,latitude,longitude,is_wishlist,created_at,updated_at,user_id')
        .eq('id', restaurant.id)
        .limit(1);
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
  return (
    <>
      <PhotoGallery 
        photos={photos} 
        photoCaptions={restaurant.photoDishNames || []} 
        initialIndex={currentPhotoIndex} 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        restaurantName={restaurant.name} 
        isMobile={isMobile} 
      />
      <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl flex flex-col h-full group">
        {/* Premium Restaurant Image Section */}
        {photos.length > 0 && (
          <div className="relative w-full h-48 lg:h-56 overflow-hidden bg-gradient-to-br from-muted/50 to-muted rounded-t-2xl">
            <img
              src={resolveImageUrl(photos[currentPhotoIndex], { width: 600 })}
              alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
              className="h-full w-full object-cover cursor-pointer transition-transform duration-500 group-hover:scale-105"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
              loading="eager"
            />
            
            {/* Gradient Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            
            {/* Gallery Click Area */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={openGallery}
            />
            
            {/* Photo Navigation for Multiple Images */}
            {hasMultiplePhotos && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-3">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-9 w-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg hover:bg-white transition-all duration-200" 
                  onClick={e => {
                    e.stopPropagation();
                    previousPhoto();
                  }}
                >
                  ←
                </Button>
                
                {/* Photo Indicators */}
                <div className="flex gap-1.5">
                  {photos.slice(0, 5).map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === currentPhotoIndex 
                          ? 'bg-white shadow-sm' 
                          : 'bg-white/50'
                      }`}
                    />
                  ))}
                  {photos.length > 5 && <span className="text-white text-xs font-medium">+{photos.length - 5}</span>}
                </div>
                
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-9 w-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg hover:bg-white transition-all duration-200" 
                  onClick={e => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                >
                  →
                </Button>
              </div>
            )}

            {/* Edit Button */}
            {onEdit && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 backdrop-blur-md hover:bg-white shadow-lg transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(restaurant.id);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Premium Content Section */}
        <div className="flex flex-col flex-1 p-5 space-y-4">
          {/* Restaurant Name & Rating */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2 flex-1">
                {restaurant.name}
              </h3>
              
              {/* Premium Rating Badge */}
              {restaurant.rating !== undefined && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {restaurant.googleMapsUrl ? (
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                      onClick={e => e.stopPropagation()}
                    >
                      <span>{restaurant.rating.toFixed(1)}</span>
                      <div className="w-3 h-3 text-primary-foreground fill-current">★</div>
                    </a>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-md">
                      <span>{restaurant.rating.toFixed(1)}</span>
                      <div className="w-3 h-3 text-primary-foreground fill-current">★</div>
                    </div>
                  )}
                  
                  {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
                      onClick={e => e.stopPropagation()}
                    >
                      ({restaurant.reviewCount.toLocaleString()})
                    </a>
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

          {/* Cuisine & Price */}
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">{restaurant.cuisine}</span>
            {restaurant.priceRange && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: restaurant.priceRange }, (_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  ))}
                  {Array.from({ length: 4 - restaurant.priceRange }, (_, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted"></span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <LocationDisplay restaurant={restaurant} />
          </div>

          {/* Hours */}
          {restaurant.openingHours && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{getCurrentDayHours(restaurant.openingHours)}</span>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {restaurant.dateVisited && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="hidden sm:inline">{format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}</span>
                <span className="sm:hidden">{format(new Date(restaurant.dateVisited), 'MMM d')}</span>
              </div>
            )}
            
            {restaurant.isWishlist && (
              <div className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent">
                Wishlist
              </div>
            )}
          </div>

          {/* Premium Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button 
              size="sm"
              className="flex-1 h-11 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border-0 transition-all duration-200 hover:scale-105 shadow-sm"
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
                  is_wishlist: restaurant.isWishlist,
                };
                navigate(`/restaurant/${restaurant.id}`, { state: { restaurantPreview: preview, returnUrl: encodeURIComponent(window.location.pathname) } });
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            
            <Button 
              size="sm"
              variant="outline"
              className="h-11 w-11 rounded-xl border-2 transition-all duration-200 hover:scale-105 shadow-sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            {onDelete && (
              <Button 
                size="sm"
                variant="outline"
                className="h-11 w-11 rounded-xl border-2 text-destructive hover:bg-destructive/10 transition-all duration-200 hover:scale-105 shadow-sm"
                onClick={() => onDelete(restaurant.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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
     </>
  );
}
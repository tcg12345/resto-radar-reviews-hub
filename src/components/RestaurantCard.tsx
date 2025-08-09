import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
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
import { LazyImage } from '@/components/LazyImage';
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
  const {
    loadRestaurantPhotos
  } = useRestaurants();
  const hasMultiplePhotos = restaurant.photos.length > 1;

  // Optimized loading - minimal delay for better perceived performance
  useEffect(() => {
    const initializeCard = () => {
      // Immediately set as ready for rated restaurants (photos are preloaded)
      setIsDataReady(true);
      
      // For images, we'll use LazyImage component which has better caching
      if (restaurant.photos.length > 0) {
        setImageLoading(false); // LazyImage will handle loading states
      } else {
        setImageLoading(false);
      }
    };
    
    // For rated restaurants, initialize immediately (photos are preloaded by parent)
    if (!restaurant.isWishlist) {
      initializeCard();
    } else {
      // Small delay for wishlist items only
      setTimeout(initializeCard, 30);
    }
  }, [restaurant.id, restaurant.isWishlist, restaurant.photos.length]);
  const nextPhoto = () => {
    setImageLoading(true);
    setCurrentPhotoIndex(prev => (prev + 1) % restaurant.photos.length);
  };
  const previousPhoto = () => {
    setImageLoading(true);
    setCurrentPhotoIndex(prev => prev === 0 ? restaurant.photos.length - 1 : prev - 1);
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
        photos={restaurant.photos} 
        photoCaptions={restaurant.photoDishNames || []} 
        initialIndex={currentPhotoIndex} 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        restaurantName={restaurant.name} 
        isMobile={isMobile} 
      />
      <Card className="overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300 lg:shadow-md lg:hover:shadow-lg flex flex-col h-full">
      {/* Show photo section based on restaurant type */}
      {restaurant.photos.length > 0 || !restaurant.isWishlist ? <div className="relative aspect-video w-full overflow-hidden bg-muted lg:aspect-video">
          {restaurant.photos.length > 0 ? <>
              <LazyImage
                src={restaurant.photos[currentPhotoIndex]}
                alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
                className="h-full w-full cursor-pointer transition-transform duration-300 hover:scale-105"
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={openGallery}
              />
              
              {hasMultiplePhotos && <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 lg:p-2">
                  <Button size="icon" variant="secondary" className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-background/80 backdrop-blur-sm text-xs" onClick={e => {
              e.stopPropagation();
              previousPhoto();
            }}>
                    &larr;
                  </Button>
                  <span className="rounded-full bg-background/80 px-1.5 py-0.5 lg:px-2 lg:py-1 text-[10px] lg:text-xs font-medium backdrop-blur-sm">
                    {currentPhotoIndex + 1}/{restaurant.photos.length}
                  </span>
                  <Button size="icon" variant="secondary" className="h-6 w-6 lg:h-8 lg:w-8 rounded-full bg-background/80 backdrop-blur-sm text-xs" onClick={e => {
              e.stopPropagation();
              nextPhoto();
            }}>
                    &rarr;
                  </Button>
                </div>}
            </> : <div className="h-full w-full flex items-center justify-center">
              {/* Empty photo box for rated restaurants only - no text */}
            </div>}
        </div> : null}
      
      <CardHeader className="pb-0 lg:pb-0 p-2 lg:p-4 relative">
        {onEdit && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 h-6 w-6 hover:bg-accent/50"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(restaurant.id);
            }}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
        <div className="mobile-space-compact lg:space-y-1">
          <CardTitle className="lg:text-lg mobile-truncate-2 text-lg font-extrabold pr-8">{restaurant.name}</CardTitle>
           <div className="mobile-space-compact lg:space-y-1">
             {restaurant.rating !== undefined && <div className="mobile-rating-container flex items-center">
                       {restaurant.googleMapsUrl ? <a href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity mobile-flex-shrink" onClick={e => e.stopPropagation()}>
                           <StarRating rating={restaurant.rating} readonly size="sm" />
                         </a> : <StarRating rating={restaurant.rating} readonly size="sm" />}
                       {restaurant.reviewCount && restaurant.reviewCount > 0 && <a href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] lg:text-xs text-muted-foreground hover:underline mobile-flex-shrink mobile-truncate" onClick={e => e.stopPropagation()}>
                           ({restaurant.reviewCount.toLocaleString()})
                         </a>}
               </div>}
            {restaurant.michelinStars && <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />}
            <div className="mobile-rating-container">
              <div className="mobile-rating-container flex items-center text-xs lg:text-sm font-medium -ml-1">
                {restaurant.priceRange && <>
                    <span className="text-green-600 mobile-badge text-sm lg:text-base">{`${'$'.repeat(restaurant.priceRange)}`}</span>
                    <span className="text-muted-foreground">•</span>
                  </>}
                <span className="text-foreground mobile-truncate mobile-flex-shrink px-[6px]">{restaurant.cuisine}</span>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="flex items-center text-xs lg:text-sm text-muted-foreground mobile-truncate mb-0">
          <MapPin className="mr-1 h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0" />
          <LocationDisplay restaurant={restaurant} />
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-0 lg:pb-0 p-2 lg:p-4 pt-0 lg:pt-0 py-[2px] flex-1">
        <div className="mobile-flex-nowrap lg:flex lg:flex-wrap mobile-grid-compact">
          {/* Current day hours display */}
          {restaurant.openingHours && <div className="w-full mb-0 lg:mb-0">
              <div className="flex items-center text-xs lg:text-sm text-muted-foreground mobile-truncate">
                <Clock className="mr-1 h-3 w-3 lg:h-3.5 lg:w-3.5 flex-shrink-0" />
                <span className="mobile-truncate">{getCurrentDayHours(restaurant.openingHours)}</span>
              </div>
            </div>}
          
          {restaurant.dateVisited && <div className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 lg:px-2 lg:py-0.5 mobile-badge text-muted-foreground flex-shrink-0">
              <Clock className="mr-1 h-2.5 w-2.5 lg:h-3 lg:w-3" />
              <span className="hidden lg:inline">{format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}</span>
              <span className="lg:hidden">{format(new Date(restaurant.dateVisited), 'MMM d')}</span>
            </div>}
          
          {restaurant.isWishlist && <div className="inline-flex items-center rounded-full bg-accent/10 px-1.5 py-0.5 lg:px-2 lg:py-0.5 mobile-badge text-accent flex-shrink-0">
              Wishlist
            </div>}
        </div>
      </CardContent>
      
      <CardFooter className="flex mobile-grid-compact pt-0 lg:pt-1 pb-1 lg:pb-2 p-2 lg:p-4">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-6 lg:h-7 px-1 lg:px-2 text-[10px] lg:text-xs mobile-button"
          onClick={() => navigate(`/restaurant/${restaurant.id}`)}
        >
          <Eye className="mr-0.5 lg:mr-1 h-2.5 w-2.5 lg:h-3 lg:w-3" />
          <span className="hidden sm:inline">Details</span>
          <span className="sm:hidden">Info</span>
        </Button>
        
        <Button size="sm" variant="outline" className="flex-1 h-6 lg:h-7 px-1.5 lg:px-2 text-[10px] lg:text-xs mobile-button" onClick={() => setIsShareDialogOpen(true)}>
          <Share2 className="mr-0.5 lg:mr-1 h-2.5 w-2.5 lg:h-3 lg:w-3" />
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">Share</span>
        </Button>
        
        {onDelete && <Button size="sm" variant="outline" className="flex-1 h-6 lg:h-7 px-1.5 lg:px-2 text-[10px] lg:text-xs text-destructive hover:bg-destructive/10 mobile-button" onClick={() => onDelete(restaurant.id)}>
            <Trash2 className="mr-0.5 lg:mr-1 h-2.5 w-2.5 lg:h-3 lg:w-3" />
            <span className="hidden sm:inline">Delete</span>
            <span className="sm:hidden">Del</span>
          </Button>}
      </CardFooter>
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
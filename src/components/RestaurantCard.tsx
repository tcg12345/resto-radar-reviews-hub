import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2, Eye, Bot, ExternalLink, Phone, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { WeightedRating } from '@/components/WeightedRating';
import { PhotoGallery } from '@/components/PhotoGallery';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { AIReviewAssistant } from '@/components/AIReviewAssistant';

import { Restaurant } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { getStateFromCoordinatesCached } from '@/utils/geocoding';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showAIReviewAssistant?: boolean;
}

// Component for displaying location with geocoding
function LocationDisplay({ restaurant }: { restaurant: Restaurant }) {
  const [locationText, setLocationText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function determineLocation() {
      if (restaurant.country === 'United States' && restaurant.latitude && restaurant.longitude) {
        setIsLoading(true);
        try {
          const state = await getStateFromCoordinatesCached(restaurant.latitude, restaurant.longitude);
          setLocationText(state ? `${restaurant.city}, ${state}` : `${restaurant.city}, United States`);
        } catch (error) {
          console.error('Error getting state:', error);
          setLocationText(`${restaurant.city}, United States`);
        } finally {
          setIsLoading(false);
        }
      } else {
        setLocationText(`${restaurant.city}${restaurant.country ? `, ${restaurant.country}` : ''}`);
      }
    }

    determineLocation();
  }, [restaurant.city, restaurant.country, restaurant.latitude, restaurant.longitude]);

  if (isLoading) {
    return <span>{restaurant.city}, ...</span>;
  }

  return <span>{locationText}</span>;
}

// Helper function to get current day's hours
const getCurrentDayHours = (hours: string) => {
  if (!hours) return 'Hours not available';
  
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  if (hours.includes('Call for hours') || hours.includes('Hours vary')) {
    return 'Call for hours';
  }
  // Extract today's hours if format includes daily breakdown
  const lines = hours.split('\n');
  const todayLine = lines.find(line => line.toLowerCase().includes(today.toLowerCase()));
  return todayLine || hours.split('\n')[0] || hours;
};

export function RestaurantCard({ restaurant, onEdit, onDelete, showAIReviewAssistant = false }: RestaurantCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAIReviewOpen, setIsAIReviewOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const { loadRestaurantPhotos } = useRestaurants();
  
  const hasMultiplePhotos = restaurant.photos.length > 1;
  
  // Load photos when component mounts if they aren't already loaded
  useEffect(() => {
    if (restaurant.photos.length === 0) {
      setIsLoadingPhotos(true);
      loadRestaurantPhotos(restaurant.id).finally(() => {
        setIsLoadingPhotos(false);
      });
    }
  }, [restaurant.id, restaurant.photos.length, loadRestaurantPhotos]);
  
  const nextPhoto = () => {
    setImageLoading(true);
    setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.photos.length);
  };
  
  const previousPhoto = () => {
    setImageLoading(true);
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? restaurant.photos.length - 1 : prev - 1
    );
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

  return (
    <>
      <PhotoGallery
        photos={restaurant.photos}
        initialIndex={currentPhotoIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        restaurantName={restaurant.name}
      />
    <Card className="overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
      {/* Show photo section based on restaurant type */}
      {restaurant.photos.length > 0 || !restaurant.isWishlist ? (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {restaurant.photos.length > 0 ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 z-10">
                  <Skeleton className="h-full w-full" />
                </div>
              )}
              <img
                src={restaurant.photos[currentPhotoIndex]}
                alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={openGallery}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
              
              {hasMultiplePhotos && (
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-2">
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      previousPhoto();
                    }}
                  >
                    &larr;
                  </Button>
                  <span className="rounded-full bg-background/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
                    {currentPhotoIndex + 1}/{restaurant.photos.length}
                  </span>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextPhoto();
                    }}
                  >
                    &rarr;
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              {/* Empty photo box for rated restaurants only - no text */}
            </div>
          )}
        </div>
      ) : null}
      
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-xl font-bold break-words">{restaurant.name}</CardTitle>
          <div className="flex flex-col gap-2">
            {restaurant.rating !== undefined && (
              <div className="flex items-center gap-2">
                      {restaurant.googleMapsUrl ? (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <StarRating rating={restaurant.rating} readonly size="sm" />
                        </a>
                      ) : (
                        <StarRating rating={restaurant.rating} readonly size="sm" />
                      )}
                      {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          ({restaurant.reviewCount.toLocaleString()} reviews)
                        </a>
                      )}
              </div>
            )}
            {restaurant.michelinStars && (
              <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center text-sm font-medium">
                {restaurant.priceRange && (
                  <>
                    <span className="text-green-600">{`${'$'.repeat(restaurant.priceRange)}`}</span>
                    <span className="mx-1 text-muted-foreground">•</span>
                  </>
                )}
                <span className="text-foreground">{restaurant.cuisine}</span>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          <LocationDisplay restaurant={restaurant} />
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2">
          {/* Current day hours display */}
          {restaurant.openingHours && (
            <div className="w-full mb-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="mr-1 h-3.5 w-3.5" />
                <span>{getCurrentDayHours(restaurant.openingHours)}</span>
              </div>
            </div>
          )}
          
          {restaurant.dateVisited && (
            <div className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
            </div>
          )}
          
          {restaurant.isWishlist && (
            <div className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              Wishlist
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2 pt-0 pb-3">
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 h-7 px-2 text-xs"
            >
              <Eye className="mr-1 h-3 w-3" />
              Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{restaurant.name}</DialogTitle>
              <DialogDescription>
                Restaurant details and information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Location</h4>
                  <p className="text-sm text-muted-foreground flex items-center">
                    <MapPin className="mr-1 h-3.5 w-3.5" />
                    <LocationDisplay restaurant={restaurant} />
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Cuisine</h4>
                  <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {restaurant.rating !== undefined && (
                  <div>
                    <h4 className="font-semibold mb-2">Rating</h4>
                    <div className="flex items-center gap-2">
                      {restaurant.googleMapsUrl ? (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:opacity-80 transition-opacity"
                        >
                          <StarRating rating={restaurant.rating} readonly size="sm" />
                        </a>
                      ) : (
                        <StarRating rating={restaurant.rating} readonly size="sm" />
                      )}
                      {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                        <a 
                          href={`https://www.google.com/search?q=${encodeURIComponent(`${restaurant.name} ${restaurant.address}`)}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          ({restaurant.reviewCount.toLocaleString()} reviews)
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {restaurant.priceRange && (
                  <div>
                    <h4 className="font-semibold mb-2">Price Range</h4>
                    <PriceRange priceRange={restaurant.priceRange} readonly size="sm" />
                  </div>
                )}
              </div>
              
              {restaurant.michelinStars && (
                <div>
                  <h4 className="font-semibold mb-2">Michelin Stars</h4>
                  <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
                </div>
              )}
              
              {restaurant.dateVisited && (
                <div>
                  <h4 className="font-semibold mb-2">Date Visited</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(restaurant.dateVisited), 'EEEE, MMMM do, yyyy')}
                  </p>
                </div>
              )}
              
              {restaurant.website && (
                <div>
                  <h4 className="font-semibold mb-2">Website</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate">{restaurant.website}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenWebsite}
                      className="h-7 text-xs"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                  </div>
                </div>
              )}
              
              {restaurant.phone_number && (
                <div>
                  <h4 className="font-semibold mb-2">Phone</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{restaurant.phone_number}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCallPhone}
                      className="h-7 text-xs"
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Call
                    </Button>
                  </div>
                </div>
              )}
              
              {restaurant.openingHours && (
                <div>
                  <OpeningHoursDisplay hours={restaurant.openingHours.split('\n')} />
                </div>
              )}
              
              {restaurant.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{restaurant.notes}</p>
                </div>
              )}
              
              {/* Action buttons inside details modal */}
              <div className="flex gap-2 pt-4 border-t">
                {showAIReviewAssistant && !restaurant.isWishlist && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsAIReviewOpen(true)}
                  >
                    <Bot className="mr-1 h-3 w-3" />
                    AI Review
                  </Button>
                )}
                
                {onEdit && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => onEdit(restaurant.id)}
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {onDelete && (
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(restaurant.id)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        )}
      </CardFooter>
     </Card>
     
     {/* AI Review Assistant Dialog */}
     {showAIReviewAssistant && (
       <Dialog open={isAIReviewOpen} onOpenChange={setIsAIReviewOpen}>
         <DialogContent className="max-w-4xl">
           <DialogHeader>
             <DialogTitle>AI Review Assistant - {restaurant.name}</DialogTitle>
           </DialogHeader>
           <AIReviewAssistant 
             restaurantName={restaurant.name}
             cuisine={restaurant.cuisine}
             rating={restaurant.rating}
             priceRange={restaurant.priceRange}
             currentReview={restaurant.notes}
             onReviewUpdate={(review) => {
               // This is just for viewing, not editing, so we'll show a message
               navigator.clipboard.writeText(review);
               // You could add a toast here to show it was copied
             }}
           />
         </DialogContent>
       </Dialog>
     )}
    </>
  );
}
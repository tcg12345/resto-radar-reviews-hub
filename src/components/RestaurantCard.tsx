import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2, Eye } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { WeightedRating } from '@/components/WeightedRating';
import { PhotoGallery } from '@/components/PhotoGallery';
import { Restaurant } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { getStateFromCoordinatesCached } from '@/utils/geocoding';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
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

export function RestaurantCard({ restaurant, onEdit, onDelete }: RestaurantCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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
    setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.photos.length);
  };
  
  const previousPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? restaurant.photos.length - 1 : prev - 1
    );
  };

  const openGallery = () => {
    setIsGalleryOpen(true);
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
      {/* Only show photo section if restaurant has photos */}
      {restaurant.photos.length > 0 && (
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={restaurant.photos[currentPhotoIndex]}
            alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
            onClick={openGallery}
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
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-xl font-bold break-words">{restaurant.name}</CardTitle>
          <div className="flex flex-col gap-2">
            {restaurant.rating !== undefined && (
              <StarRating rating={restaurant.rating} readonly size="sm" />
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
      
      <CardFooter className="flex justify-end gap-2 pt-0">
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8"
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{restaurant.name}</DialogTitle>
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
                    <StarRating rating={restaurant.rating} readonly size="sm" />
                  </div>
                )}
                {restaurant.priceRange && (
                  <div>
                    <h4 className="font-semibold mb-2">Price Range</h4>
                    <span className="text-green-600 font-medium">{`${'$'.repeat(restaurant.priceRange)}`}</span>
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
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Clock className="mr-1 h-3 w-3" />
                    {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
              
              {restaurant.isWishlist && (
                <div>
                  <h4 className="font-semibold mb-2">Status</h4>
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                    Wishlist
                  </span>
                </div>
              )}
              
              {restaurant.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{restaurant.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {onEdit && (
          <Button 
            size="sm" 
            variant="outline"
            className="h-8"
            onClick={() => onEdit(restaurant.id)}
          >
            <Edit2 className="mr-1 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
        
        {onDelete && (
          <Button 
            size="sm" 
            variant="outline" 
            className="h-8 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(restaurant.id)}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </CardFooter>
     </Card>
    </>
  );
}
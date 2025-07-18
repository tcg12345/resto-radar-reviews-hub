import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2 } from 'lucide-react';
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
import { StarRating } from '@/components/StarRating';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { WeightedRating } from '@/components/WeightedRating';
import { PhotoGallery } from '@/components/PhotoGallery';
import { Restaurant } from '@/types/restaurant';
import { useRestaurants } from '@/contexts/RestaurantContext';

// Map of major US cities to states
const US_CITY_TO_STATE: Record<string, string> = {
  'new york': 'New York',
  'los angeles': 'California',
  'chicago': 'Illinois',
  'houston': 'Texas',
  'phoenix': 'Arizona',
  'philadelphia': 'Pennsylvania',
  'san antonio': 'Texas',
  'san diego': 'California',
  'dallas': 'Texas',
  'san jose': 'California',
  'austin': 'Texas',
  'jacksonville': 'Florida',
  'fort worth': 'Texas',
  'columbus': 'Ohio',
  'indianapolis': 'Indiana',
  'charlotte': 'North Carolina',
  'san francisco': 'California',
  'seattle': 'Washington',
  'denver': 'Colorado',
  'washington': 'District of Columbia',
  'boston': 'Massachusetts',
  'el paso': 'Texas',
  'detroit': 'Michigan',
  'nashville': 'Tennessee',
  'portland': 'Oregon',
  'memphis': 'Tennessee',
  'oklahoma city': 'Oklahoma',
  'las vegas': 'Nevada',
  'louisville': 'Kentucky',
  'baltimore': 'Maryland',
  'milwaukee': 'Wisconsin',
  'albuquerque': 'New Mexico',
  'tucson': 'Arizona',
  'fresno': 'California',
  'mesa': 'Arizona',
  'sacramento': 'California',
  'atlanta': 'Georgia',
  'kansas city': 'Missouri',
  'colorado springs': 'Colorado',
  'omaha': 'Nebraska',
  'raleigh': 'North Carolina',
  'miami': 'Florida',
  'long beach': 'California',
  'virginia beach': 'Virginia',
  'oakland': 'California',
  'minneapolis': 'Minnesota',
  'tulsa': 'Oklahoma',
  'arlington': 'Texas',
  'tampa': 'Florida',
  'new orleans': 'Louisiana',
  'wichita': 'Kansas',
  'cleveland': 'Ohio',
  'bakersfield': 'California',
  'aurora': 'Colorado',
  'anaheim': 'California',
  'honolulu': 'Hawaii',
  'santa ana': 'California',
  'riverside': 'California',
  'corpus christi': 'Texas',
  'lexington': 'Kentucky',
  'stockton': 'California',
  'henderson': 'Nevada',
  'saint paul': 'Minnesota',
  'st. paul': 'Minnesota',
  'cincinnati': 'Ohio',
  'pittsburgh': 'Pennsylvania',
  'greensboro': 'North Carolina',
  'anchorage': 'Alaska',
  'plano': 'Texas',
  'lincoln': 'Nebraska',
  'orlando': 'Florida',
  'irvine': 'California',
  'newark': 'New Jersey',
  'toledo': 'Ohio',
  'jersey city': 'New Jersey',
  'chula vista': 'California',
  'fort wayne': 'Indiana',
  'buffalo': 'New York',
  'chandler': 'Arizona',
  'st. petersburg': 'Florida',
  'saint petersburg': 'Florida',
  'laredo': 'Texas',
  'durham': 'North Carolina',
  'madison': 'Wisconsin',
  'lubbock': 'Texas',
  'winston-salem': 'North Carolina',
  'garland': 'Texas',
  'glendale': 'Arizona',
  'hialeah': 'Florida',
  'reno': 'Nevada',
  'baton rouge': 'Louisiana',
  'irving': 'Texas',
  'chesapeake': 'Virginia',
  'scottsdale': 'Arizona',
  'north las vegas': 'Nevada',
  'fremont': 'California',
  'gilbert': 'Arizona',
  'san bernardino': 'California',
  'boise': 'Idaho',
  'birmingham': 'Alabama'
};

function getLocationSuffix(city: string, country?: string): string {
  if (country === 'United States') {
    const state = US_CITY_TO_STATE[city.toLowerCase()];
    return state ? `, ${state}` : ', United States';
  }
  return country ? `, ${country}` : '';
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RestaurantCard({ restaurant, onEdit, onDelete }: RestaurantCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
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
      <div className="relative aspect-video w-full overflow-hidden">
        {restaurant.photos.length > 0 ? (
          <img
            src={restaurant.photos[currentPhotoIndex]}
            alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
            onClick={openGallery}
          />
        ) : isLoadingPhotos ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-muted-foreground">No photos available</p>
          </div>
        )}
        
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
          {restaurant.city}{getLocationSuffix(restaurant.city, restaurant.country)}
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
        
        {restaurant.notes && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {restaurant.notes}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2 pt-0">
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
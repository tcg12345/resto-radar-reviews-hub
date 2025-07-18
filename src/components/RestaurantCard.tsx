import { useState } from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Tag, Edit2, Trash2 } from 'lucide-react';
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
import { Restaurant } from '@/types/restaurant';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function RestaurantCard({ restaurant, onEdit, onDelete }: RestaurantCardProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const hasMultiplePhotos = restaurant.photos.length > 1;
  
  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % restaurant.photos.length);
  };
  
  const previousPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev === 0 ? restaurant.photos.length - 1 : prev - 1
    );
  };

  return (
    <Card className="overflow-hidden bg-card shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="relative aspect-video w-full overflow-hidden">
        {restaurant.photos.length > 0 ? (
          <img
            src={restaurant.photos[currentPhotoIndex]}
            alt={`${restaurant.name} photo ${currentPhotoIndex + 1}`}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
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
              onClick={previousPhoto}
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
              onClick={nextPhoto}
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
            {restaurant.michelinStars && (
              <MichelinStars stars={restaurant.michelinStars} readonly size="sm" />
            )}
            {restaurant.rating !== undefined && (
              <StarRating rating={restaurant.rating} readonly size="sm" />
            )}
            {restaurant.priceRange && (
              <PriceRange priceRange={restaurant.priceRange} readonly size="sm" />
            )}
          </div>
        </div>
        <CardDescription className="flex items-center text-sm text-muted-foreground">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          {restaurant.address}, {restaurant.city}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center rounded-full bg-culinary/10 px-2.5 py-1 text-xs font-medium text-culinary">
            <Tag className="mr-1 h-3 w-3" />
            {restaurant.cuisine}
          </div>
          
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
  );
}
import { useState } from 'react';
import { MapPin, Star, Calendar, Trash2, Edit3, ExternalLink, Phone, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Restaurant } from '@/types/restaurant';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { MobilePhotoDisplay } from '@/components/MobilePhotoDisplay';
import { LazyImage } from '@/components/LazyImage';
import { ReservationButton } from '@/components/ReservationButton';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';

interface MobileRestaurantCardProps {
  restaurant: Restaurant;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export function MobileRestaurantCard({ 
  restaurant, 
  onEdit, 
  onDelete, 
  showActions = true 
}: MobileRestaurantCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleOpenWebsite = () => {
    if (restaurant.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <Card 
        className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary transition-colors cursor-pointer"
        onClick={() => setIsDetailsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {restaurant.photos && restaurant.photos.length > 0 && (
              <div className="flex-shrink-0">
                <LazyImage
                  src={restaurant.photos[0]}
                  alt={restaurant.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-base leading-tight truncate">
                  {restaurant.name}
                </h3>
                {restaurant.rating && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{restaurant.rating}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                {restaurant.cuisine && (
                  <Badge variant="secondary" className="text-xs">
                    {restaurant.cuisine}
                  </Badge>
                )}
                
                {restaurant.address && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {truncateText(restaurant.address, 30)}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs">
                  {restaurant.priceRange && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <PriceRange priceRange={restaurant.priceRange} readonly size="sm" />
                    </div>
                  )}
                  
                  {restaurant.michelinStars && restaurant.michelinStars > 0 && (
                    <MichelinStars stars={restaurant.michelinStars} size="sm" />
                  )}
                </div>
                
                {restaurant.dateVisited && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Visited {formatDate(restaurant.dateVisited)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {restaurant.notes && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {restaurant.notes}
            </p>
          )}
          
          {showActions && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(restaurant.id);
                  }}
                  className="flex-1"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
              
              {restaurant.website && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenWebsite();
                  }}
                  className="flex-1"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </Button>
              )}
              
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(restaurant.id);
                  }}
                  className="px-3"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-xl">{restaurant.name}</SheetTitle>
            <SheetDescription>
              {restaurant.cuisine} • {restaurant.address}
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {restaurant.photos && restaurant.photos.length > 0 && (
              <MobilePhotoDisplay photos={restaurant.photos} restaurantName={restaurant.name} />
            )}
            
            <div className="grid grid-cols-2 gap-4">
              {restaurant.rating && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Rating</p>
                  <StarRating rating={restaurant.rating} readonly showValue />
                </div>
              )}
              
              {restaurant.priceRange && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Price Range</p>
                  <PriceRange priceRange={restaurant.priceRange} readonly />
                </div>
              )}
              
              {restaurant.michelinStars && restaurant.michelinStars > 0 && (
                <div className="space-y-1 col-span-2">
                  <p className="text-sm font-medium">Michelin Stars</p>
                  <MichelinStars stars={restaurant.michelinStars} size="md" />
                </div>
              )}
            </div>
            
            {restaurant.openingHours && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Opening Hours</p>
                <div className="text-sm text-muted-foreground">
                  {Array.isArray(restaurant.openingHours) ? (
                    <OpeningHoursDisplay hours={restaurant.openingHours} />
                  ) : (
                    <p>{restaurant.openingHours}</p>
                  )}
                </div>
              </div>
            )}
            
            {restaurant.notes && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {restaurant.notes}
                </p>
              </div>
            )}
            
            {restaurant.dateVisited && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Date Visited</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{formatDate(restaurant.dateVisited)}</span>
                </div>
              </div>
            )}
            
            {restaurant.website && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Website</p>
                <Button onClick={handleOpenWebsite} variant="outline" size="sm" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </Button>
              </div>
            )}
            
            {restaurant.phone_number && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Phone</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex-1">{restaurant.phone_number}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${restaurant.phone_number}`, '_self')}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-4">
              <ReservationButton restaurant={restaurant} variant="default" size="default" className="flex-1" />
              
              {restaurant.website && (
                <Button onClick={handleOpenWebsite} className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </Button>
              )}
              
              {showActions && onEdit && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDetailsOpen(false);
                    onEdit(restaurant.id);
                  }}
                  className="flex-1"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
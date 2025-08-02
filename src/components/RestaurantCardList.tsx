import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { format } from 'date-fns';
import { MapPin, Clock, Edit2, Trash2, Eye, Share2, Phone, Globe } from 'lucide-react';
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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const { loadRestaurantPhotos } = useRestaurants();

  // Load photos if needed
  useEffect(() => {
    const loadPhotos = async () => {
      if (restaurant.photos.length === 0) {
        await loadRestaurantPhotos(restaurant.id);
      }
    };
    loadPhotos();
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
      
      <Card className="overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className={isMobile ? "block" : "flex"}>
          {/* Photo section */}
          {restaurant.photos.length > 0 && (
            <div className={`relative overflow-hidden ${
              isMobile 
                ? "w-full h-48" 
                : "w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0"
            }`}>
              <img 
                src={restaurant.photos[currentPhotoIndex]} 
                alt={`${restaurant.name} photo`}
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105 cursor-pointer"
                onClick={openGallery}
              />
            </div>
          )}
          
          {/* Content section */}
          <div className="flex-1 flex flex-col">
            <CardHeader className={`pb-3 ${isMobile ? "p-4" : "p-3 lg:p-4"}`}>
              <div className={`${isMobile ? "space-y-3" : "flex justify-between items-start"}`}>
                <div className="flex-1">
                  <CardTitle className={`font-bold line-clamp-2 ${isMobile ? "text-xl mb-3" : "text-base lg:text-lg"}`}>
                    {restaurant.name}
                  </CardTitle>
                  
                  {/* Rating section - improved for mobile */}
                  {restaurant.rating !== undefined && (
                    <div className={`flex items-center gap-3 ${isMobile ? "mb-3" : "mb-2"}`}>
                      <div className="flex items-center gap-2">
                        <StarRating rating={restaurant.rating} readonly size={isMobile ? "md" : "sm"} />
                        <span className={`font-semibold text-foreground ${isMobile ? "text-lg" : "text-sm"}`}>
                          {restaurant.rating}/10
                        </span>
                      </div>
                      {restaurant.reviewCount && restaurant.reviewCount > 0 && (
                        <span className={`text-muted-foreground ${isMobile ? "text-sm" : "text-xs"}`}>
                          ({restaurant.reviewCount.toLocaleString()})
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Michelin stars - separate line for mobile */}
                  {restaurant.michelinStars && (
                    <div className={`${isMobile ? "mb-3" : "mb-2"}`}>
                      <MichelinStars stars={restaurant.michelinStars} readonly size={isMobile ? "md" : "sm"} />
                    </div>
                  )}
                  
                  {/* Price and cuisine - better spacing for mobile */}
                  <div className={`flex items-center gap-2 ${isMobile ? "text-base mb-3" : "text-sm mb-2"}`}>
                    {restaurant.priceRange && (
                      <>
                        <span className="text-green-600 font-semibold">
                          {'$'.repeat(restaurant.priceRange)}
                        </span>
                        <span className="text-muted-foreground">•</span>
                      </>
                    )}
                    <span className="text-foreground font-medium">{restaurant.cuisine}</span>
                  </div>
                </div>
                
                {/* Action buttons - improved mobile layout */}
                {!isMobile && (
                  <div className="flex gap-1 ml-2">
                    <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{restaurant.name}</DialogTitle>
                          <DialogDescription>Restaurant details and information</DialogDescription>
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
                          
                          {restaurant.website && (
                            <div>
                              <h4 className="font-semibold mb-2">Website</h4>
                              <Button variant="outline" onClick={handleOpenWebsite} className="w-full h-auto p-3 justify-start">
                                <Globe className="h-4 w-4 mr-3" />
                                <span className="text-sm">Visit Website</span>
                              </Button>
                            </div>
                          )}
                          
                          {restaurant.phone_number && (
                            <div>
                              <h4 className="font-semibold mb-2">Phone</h4>
                              <Button variant="outline" onClick={handleCallPhone} className="w-full h-auto p-3 justify-start">
                                <Phone className="h-4 w-4 mr-3" />
                                <span className="text-sm">{restaurant.phone_number}</span>
                              </Button>
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
                          
                          <div className="flex gap-2 pt-4 border-t">
                            {onEdit && (
                              <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(restaurant.id)}>
                                <Edit2 className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-xs" 
                      onClick={() => setIsShareDialogOpen(true)}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                    
                    {onDelete && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10" 
                        onClick={() => onDelete(restaurant.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className={`pt-0 flex-1 flex flex-col justify-between ${isMobile ? "p-4" : "p-3 lg:p-4"}`}>
              <div className={`space-y-2 ${isMobile ? "mb-4" : ""}`}>
                <div className={`flex items-center text-muted-foreground ${isMobile ? "text-sm" : "text-xs"}`}>
                  <MapPin className={`mr-2 flex-shrink-0 ${isMobile ? "h-4 w-4" : "h-3 w-3"}`} />
                  <LocationDisplay restaurant={restaurant} />
                </div>
                
                {restaurant.openingHours && (
                  <div className={`flex items-center text-muted-foreground ${isMobile ? "text-sm" : "text-xs"}`}>
                    <Clock className={`mr-2 flex-shrink-0 ${isMobile ? "h-4 w-4" : "h-3 w-3"}`} />
                    <span className="line-clamp-1">
                      {restaurant.openingHours.split('\n')[0]}
                    </span>
                  </div>
                )}
                
                {restaurant.dateVisited && (
                  <div className={`text-muted-foreground ${isMobile ? "text-sm" : "text-xs"}`}>
                    Visited: {format(new Date(restaurant.dateVisited), 'MMM d, yyyy')}
                  </div>
                )}
                
                {restaurant.isWishlist && (
                  <div className={`inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-accent ${isMobile ? "text-sm" : "text-xs"}`}>
                    Wishlist
                  </div>
                )}
              </div>
              
              {/* Mobile action buttons */}
              {isMobile && (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1 h-9">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{restaurant.name}</DialogTitle>
                        <DialogDescription>Restaurant details and information</DialogDescription>
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
                        
                        {restaurant.website && (
                          <div>
                            <h4 className="font-semibold mb-2">Website</h4>
                            <Button variant="outline" onClick={handleOpenWebsite} className="w-full h-auto p-3 justify-start">
                              <Globe className="h-4 w-4 mr-3" />
                              <span className="text-sm">Visit Website</span>
                            </Button>
                          </div>
                        )}
                        
                        {restaurant.phone_number && (
                          <div>
                            <h4 className="font-semibold mb-2">Phone</h4>
                            <Button variant="outline" onClick={handleCallPhone} className="w-full h-auto p-3 justify-start">
                              <Phone className="h-4 w-4 mr-3" />
                              <span className="text-sm">{restaurant.phone_number}</span>
                            </Button>
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
                        
                        <div className="flex gap-2 pt-4 border-t">
                          {onEdit && (
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(restaurant.id)}>
                              <Edit2 className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-9 px-4" 
                    onClick={() => setIsShareDialogOpen(true)}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  
                  {onDelete && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-9 px-4 text-destructive hover:bg-destructive/10" 
                      onClick={() => onDelete(restaurant.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
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
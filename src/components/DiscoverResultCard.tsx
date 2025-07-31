import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { CommunityRating } from '@/components/CommunityRating';
import { CommunityPhotoGallery } from '@/components/CommunityPhotoGallery';
import { UserReviewDialog } from '@/components/UserReviewDialog';
import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';

import { 
  Star, 
  MapPin, 
  Heart, 
  ExternalLink, 
  Phone, 
  Clock, 
  Globe,
  Award,
  Users,
  Car,
  Wifi,
  CreditCard,
  ChefHat,
  ChevronDown,
  Eye,
  ShoppingBag,
  Truck
} from 'lucide-react';


interface RestaurantResult {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  priceRange: number;
  rating: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  website?: string;
  phoneNumber?: string;
  openingHours?: string;
  features: string[];
  michelinStars?: number;
  location?: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  images?: string[];
  isOpen?: boolean;
  reservable?: boolean;
  reservationUrl?: string;
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
  };
}

interface DiscoverResultCardProps {
  restaurant: RestaurantResult;
  onToggleWishlist: (restaurant: RestaurantResult) => void;
  isInWishlist: boolean;
  onViewDetails?: (restaurant: RestaurantResult) => void;
}

const FEATURE_ICONS: { [key: string]: any } = {
  outdoor: Car,
  wifi: Wifi,
  vegetarian: ChefHat,
  family: Users,
  card: CreditCard,
  default: ChefHat
};

const getFeatureIcon = (feature: string) => {
  const lowerFeature = feature.toLowerCase();
  if (lowerFeature.includes('outdoor') || lowerFeature.includes('patio')) return FEATURE_ICONS.outdoor;
  if (lowerFeature.includes('wifi')) return FEATURE_ICONS.wifi;
  if (lowerFeature.includes('vegetarian') || lowerFeature.includes('vegan')) return FEATURE_ICONS.vegetarian;
  if (lowerFeature.includes('family') || lowerFeature.includes('kids')) return FEATURE_ICONS.family;
  if (lowerFeature.includes('card') || lowerFeature.includes('payment')) return FEATURE_ICONS.card;
  return FEATURE_ICONS.default;
};

export function DiscoverResultCard({ restaurant, onToggleWishlist, isInWishlist, onViewDetails }: DiscoverResultCardProps) {
  const { user } = useAuth();
  const { addRestaurant } = useRestaurants();
  const [isDataReady, setIsDataReady] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [showFullWeekHours, setShowFullWeekHours] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  
  // Use restaurant place_id if available, otherwise fallback to restaurant.id
  const placeId = restaurant.id;
  const { communityStats, isLoading: isLoadingReviews, submitReview } = useRestaurantReviews(placeId);

  // Preload all data when component mounts
  useEffect(() => {
    const preloadData = async () => {
      // Preload image if available
      if (restaurant.images?.[0]) {
        const img = new Image();
        img.onload = () => setImageLoading(false);
        img.onerror = () => {
          setImageError(true);
          setImageLoading(false);
        };
        img.src = restaurant.images[0];
      } else {
        setImageLoading(false);
      }
      
      // Small delay to ensure all data is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsDataReady(true);
    };

    preloadData();
  }, [restaurant.images]);

  const getPriceDisplay = (range: number) => '$'.repeat(Math.min(range, 4));
  
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleRatingClick = () => {
    const searchQuery = `${restaurant.name} ${restaurant.address || restaurant.location?.city || ''} reviews`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };

  const getCurrentDayHours = (hours: string) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if (hours.includes('Call for hours') || hours.includes('Hours vary')) {
      return 'Call for hours';
    }
    // Extract today's hours if format includes daily breakdown
    const lines = hours.split('\n');
    const todayLine = lines.find(line => line.toLowerCase().includes(today.toLowerCase()));
    return todayLine || hours.split('\n')[0] || hours;
  };

  const getFormattedWeekHours = (hours: string) => {
    if (hours.includes('Call for hours') || hours.includes('Hours vary')) {
      return ['Monday: Call for hours', 'Tuesday: Call for hours', 'Wednesday: Call for hours', 
              'Thursday: Call for hours', 'Friday: Call for hours', 'Saturday: Call for hours', 'Sunday: Call for hours'];
    }
    return hours.split('\n').filter(line => line.trim());
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }
    
    setIsAddingToWishlist(true);
    
    try {
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.location?.city || '',
            country: restaurant.location?.country || '',
            cuisine: restaurant.cuisine,
            notes: 'Added from Smart Discovery'
          }
        });
        if (aiData && aiData.michelinStars !== null) {
          michelinStars = aiData.michelinStars;
        }
      } catch (error) {
        console.log('Could not determine Michelin stars:', error);
      }

      const restaurantFormData = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.location?.city || '',
        country: restaurant.location?.country || '',
        cuisine: restaurant.cuisine,
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: restaurant.priceRange,
        michelinStars: michelinStars,
        notes: 'Added from Smart Discovery',
        dateVisited: '',
        photos: [],
        isWishlist: true,
      };
      
      await addRestaurant(restaurantFormData);
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error(`Failed to add to wishlist: ${error.message}`);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleMoreInfoToggle = (open: boolean) => {
    setIsMoreInfoOpen(open);
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=240&fit=crop&auto=format';

  // Show skeleton until all data is ready
  if (!isDataReady) {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="h-60 w-full" />
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-muted/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm">
      {/* Hero Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageLoading && (
          <div className="absolute inset-0 z-10">
            <Skeleton className="h-full w-full" />
          </div>
        )}
        
        <img
          src={imageError ? fallbackImage : (restaurant.images?.[0] || fallbackImage)}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onLoad={() => setImageLoading(false)}
          onError={handleImageError}
        />
        
        {/* Status and Wishlist Badges */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant={restaurant.isOpen ? "default" : "secondary"}
            className={`${restaurant.isOpen ? "bg-green-600 hover:bg-green-700" : "bg-gray-500"} shadow-lg`}
          >
            {restaurant.isOpen ? "Open Now" : "Closed"}
          </Badge>
        </div>
        
        <div className="absolute top-3 right-3">
          <Button
            size="icon"
            variant="secondary"
            className={`h-10 w-10 shadow-lg transition-all duration-200 ${
              isInWishlist 
                ? 'bg-red-500 hover:bg-red-600 text-white scale-110' 
                : 'bg-white/90 hover:bg-white text-gray-700 hover:scale-110'
            }`}
            onClick={handleAddToWishlist}
            disabled={isAddingToWishlist}
          >
            <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pb-2">
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
            {restaurant.name}
          </CardTitle>
          
          {/* Rating - Clickable */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={handleRatingClick}
                className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{restaurant.rating}</span>
                {restaurant.reviewCount && (
                  <span className="text-xs text-muted-foreground">
                    ({restaurant.reviewCount.toLocaleString()})
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Price and Cuisine */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-green-600 font-bold text-lg">
              {restaurant.yelpData?.price || getPriceDisplay(restaurant.priceRange)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {restaurant.cuisine}
            </Badge>
            {restaurant.yelpData && (
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 border-red-200">
                Yelp ✓
              </Badge>
            )}
          </div>

          {/* Yelp Services */}
          {restaurant.yelpData?.transactions && restaurant.yelpData.transactions.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {restaurant.yelpData.transactions.includes('delivery') && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Delivery
                </Badge>
              )}
              {restaurant.yelpData.transactions.includes('pickup') && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3" />
                  Pickup
                </Badge>
              )}
            </div>
          )}

          {/* Location */}
          <CardDescription className="flex items-center text-sm">
            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span className="truncate">
              {restaurant.location?.city || 'Unknown location'}
            </span>
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Info */}
        <div className="space-y-2">
          {restaurant.phoneNumber && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span className="truncate">{restaurant.phoneNumber}</span>
            </div>
          )}
          
          {restaurant.openingHours && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span className="flex-1 truncate">{getCurrentDayHours(restaurant.openingHours)}</span>
                <Collapsible open={showFullWeekHours} onOpenChange={setShowFullWeekHours}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-muted"
                    >
                      <ChevronDown className={`h-3 w-3 transition-transform ${showFullWeekHours ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
              <Collapsible open={showFullWeekHours} onOpenChange={setShowFullWeekHours}>
                <CollapsibleContent className="ml-6">
                  <div className="bg-muted/30 rounded-md p-2 space-y-1 max-w-48">
                    {getFormattedWeekHours(restaurant.openingHours).map((dayHours, index) => (
                      <div key={index} className="text-sm text-foreground whitespace-nowrap">
                        {dayHours}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails?.(restaurant)}
              className="col-span-2 h-8 text-xs"
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const website = restaurant.website || restaurant.googleMapsUrl || `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`;
                window.open(website, '_blank');
              }}
            >
              <Globe className="h-3 w-3 mr-1" />
              Website
            </Button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <Collapsible open={isMoreInfoOpen} onOpenChange={handleMoreInfoToggle}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs w-full justify-between"
                >
                  <div className="flex items-center">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    More Info
                  </div>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isMoreInfoOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
          
          <Collapsible open={isMoreInfoOpen} onOpenChange={handleMoreInfoToggle}>
            <CollapsibleContent className="space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                
                {restaurant.phoneNumber && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs w-full justify-start"
                    onClick={() => window.open(`tel:${restaurant.phoneNumber}`, '_self')}
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Call Restaurant
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs w-full justify-start"
                  onClick={() => window.open(restaurant.googleMapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(restaurant.name + ' ' + restaurant.address)}`, '_blank')}
                >
                  <MapPin className="h-3 w-3 mr-2" />
                  View on Map
                </Button>
                
                 {restaurant.yelpData && (
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-8 text-xs w-full justify-start"
                     onClick={() => window.open(restaurant.yelpData.url, '_blank')}
                   >
                     <Star className="h-3 w-3 mr-2" />
                     View on Yelp
                   </Button>
                 )}
                 
                 {user && (
                   <Button
                     variant="ghost"
                     size="sm"
                     className="h-8 text-xs w-full justify-start"
                     onClick={() => setIsReviewDialogOpen(true)}
                   >
                     <Star className="h-3 w-3 mr-2" />
                     Write Review
                   </Button>
                 )}
                </div>
               
                {/* Community Rating */}
                <CommunityRating 
                  stats={communityStats} 
                  isLoading={isLoadingReviews} 
                />
                
                {/* Community Photo Gallery */}
                <CommunityPhotoGallery 
                  stats={communityStats}
                  isLoading={isLoadingReviews}
                  onPhotoClick={() => {}}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        </CardContent>

        {/* Review Dialog */}
        <UserReviewDialog
          isOpen={isReviewDialogOpen}
          onClose={() => setIsReviewDialogOpen(false)}
          restaurantName={restaurant.name}
          restaurantAddress={restaurant.address}
          onSubmit={submitReview}
        />
      </Card>
    );
  }
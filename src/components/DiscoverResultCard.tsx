import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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
  Eye
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
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [showFullWeekHours, setShowFullWeekHours] = useState(false);

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

  const handleMoreInfoToggle = (open: boolean) => {
    setIsMoreInfoOpen(open);
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=240&fit=crop&auto=format';

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
            onClick={() => onToggleWishlist(restaurant)}
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
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold text-lg">
              {getPriceDisplay(restaurant.priceRange)}
            </span>
            <Badge variant="outline" className="text-xs font-medium">
              {restaurant.cuisine}
            </Badge>
          </div>

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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>

    </Card>
  );
}
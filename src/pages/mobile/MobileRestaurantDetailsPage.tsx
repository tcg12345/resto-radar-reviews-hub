import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Plus, 
  Check, 
  Heart,
  Share2,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country?: string;
  cuisine: string;
  rating?: number;
  price_range?: number;
  michelin_stars?: number;
  photos?: string[];
  notes?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone_number?: string;
  opening_hours?: string;
  reservable?: boolean;
  reservation_url?: string;
  date_visited?: string;
  is_wishlist?: boolean;
  user_id: string;
}

export default function MobileRestaurantDetailsPage() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    
    const fetchRestaurant = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .single();

        if (error) {
          console.error('Error fetching restaurant:', error);
          toast({ title: "Error loading restaurant", variant: "destructive" });
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate('/');
          }
          return;
        }

        setRestaurant(data);
      } catch (error) {
        console.error('Error:', error);
        toast({ title: "Error loading restaurant", variant: "destructive" });
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId, navigate, toast]);

  const getPriceRangeDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  const addToWishlist = async () => {
    if (!user || !restaurant) return;

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .insert({
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          country: restaurant.country,
          cuisine: restaurant.cuisine,
          price_range: restaurant.price_range,
          michelin_stars: restaurant.michelin_stars,
          photos: restaurant.photos || [],
          notes: restaurant.notes,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          website: restaurant.website,
          phone_number: restaurant.phone_number,
          opening_hours: restaurant.opening_hours,
          reservable: restaurant.reservable || false,
          reservation_url: restaurant.reservation_url,
          is_wishlist: true,
          user_id: user.id
        });

      if (error) {
        console.error('Error adding to wishlist:', error);
        toast({ title: "Failed to add to wishlist", variant: "destructive" });
        return;
      }

      setIsAdded(true);
      toast({ title: "Added to wishlist!" });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({ title: "Failed to add to wishlist", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const shareRestaurant = async () => {
    if (!restaurant) return;
    
    try {
      await navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} - ${restaurant.cuisine} restaurant in ${restaurant.city}`,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          </div>
        </div>
        
        {/* Loading content */}
        <div className="p-4 space-y-4">
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Restaurant not found</p>
          <Button onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canAddToWishlist = user && restaurant.user_id !== user.id;

  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      <div className="min-h-screen bg-background">
        {/* Compact Mobile Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const currentPath = location.pathname;
                  if (currentPath.includes('/mobile/restaurant/')) {
                    navigate('/');
                  } else {
                    if (window.history.length > 1) {
                      navigate(-1);
                    } else {
                      navigate('/');
                    }
                  }
                }}
                className="h-8 w-8 p-0 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="font-semibold truncate text-base">{restaurant.name}</h1>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {canAddToWishlist && (
                <Button
                  onClick={addToWishlist}
                  disabled={isAdding || isAdded}
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 bg-red-500 border-red-500 hover:bg-red-600"
                >
                  {isAdded ? (
                    <Heart className="h-4 w-4 fill-white text-white" />
                  ) : (
                    <Heart className="h-4 w-4 text-white" />
                  )}
                </Button>
              )}
              <Button
                onClick={shareRestaurant}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Share2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Content */}
        <div className="pb-4">
          {/* Hero Image - Smaller on mobile */}
          {restaurant.photos && restaurant.photos.length > 0 && (
            <div className="relative h-40 bg-muted">
              <LazyImage
                src={restaurant.photos[0]}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Compact Main Info */}
          <div className="px-3 py-4 space-y-3">
            {/* Title and Basic Info */}
            <div className="space-y-2">
              <div>
                <h1 className="text-xl font-bold leading-tight">{restaurant.name}</h1>
                <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
              </div>
              
              {/* Condensed Badges Row */}
              <div className="flex items-center gap-1 flex-wrap">
                {restaurant.rating && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                    {restaurant.rating}/10
                  </Badge>
                )}
                {restaurant.michelin_stars && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <MichelinStars stars={restaurant.michelin_stars} readonly size="sm" />
                  </Badge>
                )}
                {restaurant.price_range && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <PriceRange priceRange={restaurant.price_range} readonly size="sm" />
                  </Badge>
                )}
              </div>
            </div>

            {/* Mobile-Optimized Action Grid - Single row */}
            <div className="grid grid-cols-4 gap-2">
              {/* Call Button */}
              {restaurant.phone_number && (
                <a
                  href={`tel:${restaurant.phone_number}`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 active:scale-95 transition-all"
                >
                  <Phone className="h-4 w-4 text-green-600 mb-1" />
                  <span className="text-xs font-medium text-green-700">Call</span>
                </a>
              )}

              {/* Website Button */}
              {restaurant.website && (
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all"
                >
                  <Globe className="h-4 w-4 text-blue-600 mb-1" />
                  <span className="text-xs font-medium text-blue-700">Website</span>
                </a>
              )}

              {/* Directions Button */}
              <a
                href={
                  restaurant.latitude && restaurant.longitude
                    ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${restaurant.name} ${restaurant.address} ${restaurant.city}`
                      )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-purple-50 border border-purple-200 hover:bg-purple-100 active:scale-95 transition-all"
              >
                <Navigation className="h-4 w-4 text-purple-600 mb-1" />
                <span className="text-xs font-medium text-purple-700">Maps</span>
              </a>

              {/* Reviews Button */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  `${restaurant.name} ${restaurant.city} reviews`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 active:scale-95 transition-all"
              >
                <Star className="h-4 w-4 text-amber-600 mb-1" />
                <span className="text-xs font-medium text-amber-700">Reviews</span>
              </a>
            </div>

            {/* Compact Address */}
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {restaurant.address}, {restaurant.city}
                    {restaurant.country && `, ${restaurant.country}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info Cards */}
            <div className="space-y-2">
              {restaurant.phone_number && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <a 
                        href={`tel:${restaurant.phone_number}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {restaurant.phone_number}
                      </a>
                    </div>
                  </div>
                </div>
              )}
              
              {restaurant.website && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Opening Hours Dropdown */}
              {restaurant.opening_hours && (
                <div className="bg-muted/30 rounded-lg overflow-hidden">
                  <details className="group">
                    <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Opening Hours</p>
                          <p className="text-sm font-medium">
                            {restaurant.opening_hours.split('\n').filter(Boolean)[0]?.trim() || 'View hours'}
                          </p>
                        </div>
                      </div>
                      <div className="transform group-open:rotate-180 transition-transform">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-3 pb-3 space-y-1 border-t border-muted">
                      {restaurant.opening_hours.split('\n').filter(Boolean).map((hour, index) => (
                        <div key={index} className="text-xs text-muted-foreground py-0.5">
                          {hour.trim()}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Visit Date */}
            {restaurant.date_visited && (
              <div className="text-center">
                <Badge variant="secondary" className="text-xs">
                  Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                </Badge>
              </div>
            )}

            {/* Compact Notes */}
            {restaurant.notes && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Notes</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  {restaurant.notes}
                </p>
              </div>
            )}

            {/* Compact Photo Grid */}
            {restaurant.photos && restaurant.photos.length > 1 && (
              <div>
                <p className="text-sm font-medium mb-2">Photos</p>
                <div className="grid grid-cols-3 gap-1">
                  {restaurant.photos.slice(1, 4).map((photo, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-md overflow-hidden">
                      <LazyImage
                        src={photo}
                        alt={`${restaurant.name} photo ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compact Map - Only show if coordinates available */}
            {restaurant.latitude && restaurant.longitude && (
              <div>
                <p className="text-sm font-medium mb-2">Location</p>
                <div className="h-32 rounded-lg overflow-hidden border">
                  <RestaurantLocationMap
                    latitude={restaurant.latitude}
                    longitude={restaurant.longitude}
                    name={restaurant.name}
                    address={`${restaurant.address}, ${restaurant.city}`}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
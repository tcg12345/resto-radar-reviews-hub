import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';

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
          navigate(-1);
          return;
        }

        setRestaurant(data);
      } catch (error) {
        console.error('Error:', error);
        toast({ title: "Error loading restaurant", variant: "destructive" });
        navigate(-1);
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
              onClick={() => navigate(-1)}
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
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const canAddToWishlist = user && restaurant.user_id !== user.id && !restaurant.is_wishlist;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold truncate text-lg">{restaurant.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {canAddToWishlist && (
              <Button
                onClick={addToWishlist}
                disabled={isAdding || isAdded}
                size="sm"
                variant={isAdded ? "outline" : "default"}
                className="h-8"
              >
                {isAdded ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              onClick={shareRestaurant}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pb-6">
        {/* Hero Image */}
        {restaurant.photos && restaurant.photos.length > 0 && (
          <div className="relative h-48 bg-muted">
            <LazyImage
              src={restaurant.photos[0]}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Main Info */}
        <div className="p-4 space-y-4">
          {/* Title and Badges */}
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
            </div>
            
            {/* Rating and Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {restaurant.rating && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {restaurant.rating}/10
                </Badge>
              )}
              {restaurant.michelin_stars && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {'⭐'.repeat(restaurant.michelin_stars)} Michelin
                </Badge>
              )}
              {restaurant.price_range && (
                <Badge variant="outline">
                  {getPriceRangeDisplay(restaurant.price_range)}
                </Badge>
              )}
              {restaurant.date_visited && (
                <Badge variant="secondary">
                  Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Address */}
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Address</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {restaurant.address}
                <br />
                {restaurant.city}
                {restaurant.country && `, ${restaurant.country}`}
              </p>
            </div>
          </div>

          {/* Contact Info */}
          {(restaurant.phone_number || restaurant.website) && (
            <>
              <Separator />
              <div className="space-y-4">
                {restaurant.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Phone</p>
                      <a 
                        href={`tel:${restaurant.phone_number}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {restaurant.phone_number}
                      </a>
                    </div>
                  </div>
                )}
                
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">Website</p>
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Opening Hours */}
          {restaurant.opening_hours && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Opening Hours</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {restaurant.opening_hours}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {restaurant.notes && (
            <>
              <Separator />
              <div>
                <p className="font-medium mb-2">Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {restaurant.notes}
                </p>
              </div>
            </>
          )}

          {/* Reservation */}
          {restaurant.reservable && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="font-medium">Reservations Available</p>
                {restaurant.reservation_url ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a 
                      href={restaurant.reservation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      Make Reservation
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Call or visit their website to make a reservation
                  </p>
                )}
              </div>
            </>
          )}

          {/* Additional Photos */}
          {restaurant.photos && restaurant.photos.length > 1 && (
            <>
              <Separator />
              <div>
                <p className="font-medium mb-3">Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {restaurant.photos.slice(1, 5).map((photo, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <LazyImage
                        src={photo}
                        alt={`${restaurant.name} photo ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Globe,
  Clock,
  Heart,
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

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading...</div>;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Restaurant not found</p>
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}>
            <ArrowLeft />
          </Button>
          <h1 className="text-lg font-semibold truncate">{restaurant.name}</h1>
        </div>
        {canAddToWishlist && (
          <Button
            onClick={addToWishlist}
            disabled={isAdding || isAdded}
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600"
          >
            {isAdded ? (
              <Heart className="h-5 w-5 fill-current" />
            ) : (
              <Heart className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Photo */}
      {restaurant.photos && restaurant.photos.length > 0 && (
        <LazyImage
          src={restaurant.photos[0]}
          alt={restaurant.name}
          className="w-full h-60 object-cover"
        />
      )}

      <div className="p-4 space-y-4">
        <div>
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {restaurant.address}, {restaurant.city}
            {restaurant.country && `, ${restaurant.country}`}
          </div>
          <div className="mt-1 flex gap-2 items-center flex-wrap">
            <Badge>{restaurant.cuisine}</Badge>
            {restaurant.price_range && (
              <Badge variant="outline">
                <PriceRange priceRange={restaurant.price_range} readonly size="sm" />
              </Badge>
            )}
            {restaurant.michelin_stars && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MichelinStars stars={restaurant.michelin_stars} readonly size="sm" />
                Michelin
              </Badge>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex gap-4 flex-wrap">
          {restaurant.phone_number && (
            <a href={`tel:${restaurant.phone_number}`} className="flex-1">
              <Button className="w-full" variant="outline">
                <Phone className="w-4 h-4 mr-2" /> Call
              </Button>
            </a>
          )}
          {restaurant.website && (
            <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full" variant="outline">
                <Globe className="w-4 h-4 mr-2" /> Website
              </Button>
            </a>
          )}
          {restaurant.latitude && restaurant.longitude && (
            <a
              href={`https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full" variant="outline">
                <Navigation className="w-4 h-4 mr-2" /> Directions
              </Button>
            </a>
          )}
        </div>

        {restaurant.rating && (
          <div className="text-lg font-bold text-indigo-600">
            {restaurant.rating}/10 Rating
          </div>
        )}

        {restaurant.opening_hours && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium">Opening Hours</p>
              <div className="text-sm text-gray-600 space-y-1">
                {restaurant.opening_hours.split('\n').filter(Boolean).map((hour, index) => (
                  <div key={index}>{hour.trim()}</div>
                ))}
              </div>
            </div>
          </>
        )}

        {restaurant.notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{restaurant.notes}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
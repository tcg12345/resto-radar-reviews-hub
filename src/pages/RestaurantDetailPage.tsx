import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  ChefHat, 
  Globe, 
  Heart,
  Phone,
  Clock,
  ExternalLink,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { WeeklyOpeningHours } from '@/components/WeeklyOpeningHours';
import { RestaurantPhotoCarousel } from '@/components/RestaurantPhotoCarousel';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  cuisine: string;
  rating: number;
  price_range: number;
  michelin_stars: number;
  notes: string;
  photos: string[];
  website: string;
  phone_number?: string;
  latitude: number;
  longitude: number;
  reservable: boolean;
  reservation_url: string;
  opening_hours: string;
  date_visited: string;
  created_at: string;
  updated_at?: string;
  user_id: string;
  is_wishlist: boolean;
  category_ratings?: any;
  use_weighted_rating?: boolean;
}

interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
}

export function RestaurantDetailPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);

  const fetchGooglePlacesDetails = async (restaurant: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: { 
          type: 'details', 
          placeId: restaurant.id  // Assuming restaurant.id is the Google Place ID
        }
      });

      if (error) {
        console.error('Error fetching Google Places details:', error);
        return restaurant;
      }

      if (data?.result) {
        const placeDetails = data.result;
        // Update restaurant with additional details from Google Places
        const updatedRestaurant = {
          ...restaurant,
          website: restaurant.website || placeDetails.website || '',
          phone_number: restaurant.phone_number || placeDetails.formatted_phone_number || '',
          opening_hours: restaurant.opening_hours || placeDetails.opening_hours?.weekday_text?.join('\n') || '',
          photos: restaurant.photos?.length > 0 ? restaurant.photos : 
            (placeDetails.photos?.map((photo: any) => 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=YOUR_API_KEY`
            ) || [])
        };
        
        return updatedRestaurant;
      }
    } catch (error) {
      console.error('Error calling Google Places API:', error);
    }
    
    return restaurant;
  };

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId || !friendId) return;

      setIsLoading(true);
      try {
        // Fetch restaurant details
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .eq('user_id', friendId)
          .single();

        if (restaurantError) {
          console.error('Error fetching restaurant:', restaurantError);
          toast('Failed to load restaurant details');
          return;
        }

        // Try to enhance with Google Places data if missing website or phone
        let enhancedRestaurant = restaurantData;
        if (!restaurantData.website || !(restaurantData as any).phone_number) {
          enhancedRestaurant = await fetchGooglePlacesDetails(restaurantData);
        }

        setRestaurant(enhancedRestaurant);

        // Fetch friend profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .eq('id', friendId)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
        } else {
          setFriendProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Failed to load restaurant details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [restaurantId, friendId]);

  const addToWishlist = async () => {
    if (!user || !restaurant) return;

    setIsAddingToWishlist(true);
    try {
      // Check if restaurant already exists in user's wishlist
      const { data: existingRestaurant, error: checkError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', restaurant.name)
        .eq('is_wishlist', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing restaurant:', checkError);
        toast('Failed to check if restaurant already exists');
        return;
      }

      if (existingRestaurant) {
        toast(`${restaurant.name} is already in your wishlist!`);
        return;
      }

      // Add to wishlist
      const restaurantData = {
        user_id: user.id,
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        country: restaurant.country,
        cuisine: restaurant.cuisine,
        price_range: restaurant.price_range,
        michelin_stars: restaurant.michelin_stars,
        notes: restaurant.notes,
        photos: restaurant.photos,
        website: restaurant.website,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        reservable: restaurant.reservable,
        reservation_url: restaurant.reservation_url,
        opening_hours: restaurant.opening_hours,
        is_wishlist: true
      };

      const { error } = await supabase
        .from('restaurants')
        .insert([restaurantData]);

      if (error) {
        console.error('Supabase error adding to wishlist:', error);
        toast(`Failed to add restaurant to wishlist: ${error.message}`);
      } else {
        toast(`${restaurant.name} added to your wishlist!`);
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast(`Failed to add restaurant to wishlist`);
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading restaurant details...</div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium">Restaurant not found</div>
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {friendProfile && (
          <Badge variant="secondary">
            From {friendProfile.username || friendProfile.name}
          </Badge>
        )}
      </div>

      {/* Restaurant Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={restaurant.rating} readonly />
              <span className="text-xl font-bold">{restaurant.rating?.toFixed(1)}</span>
            </div>
          </div>
          <Button
            onClick={addToWishlist}
            disabled={isAddingToWishlist}
            className="bg-pink-500 hover:bg-pink-600 text-white flex items-center gap-2"
          >
            <Heart className="h-5 w-5 fill-current" />
            {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            {restaurant.cuisine}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {restaurant.city}
          </span>
          {restaurant.date_visited && (
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visited: {new Date(restaurant.date_visited).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3">
          {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
          {restaurant.michelin_stars > 0 && <MichelinStars stars={restaurant.michelin_stars} />}
        </div>
      </div>

      {/* Photos */}
      {restaurant.photos && restaurant.photos.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <RestaurantPhotoCarousel 
              photos={restaurant.photos} 
              restaurantName={restaurant.name} 
            />
          </CardContent>
        </Card>
      )}

      {/* Location Map */}
      {restaurant.latitude && restaurant.longitude && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent>
            <RestaurantLocationMap
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              name={restaurant.name}
              address={restaurant.address}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Restaurant Details */}
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">Address</div>
                <div className="text-sm text-muted-foreground">
                  {restaurant.address}
                  {restaurant.city && <div>{restaurant.city}</div>}
                  {restaurant.country && <div>{restaurant.country}</div>}
                </div>
              </div>
            </div>

            {restaurant.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Website</div>
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Visit Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {restaurant.phone_number && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{restaurant.phone_number}</span>
                    <a
                      href={`tel:${restaurant.phone_number}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Call
                    </a>
                  </div>
                </div>
              </div>
            )}

            {restaurant.latitude && restaurant.longitude && (
              <div className="flex items-start gap-3">
                <Navigation className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Directions</div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    Get Directions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {restaurant.reservable && restaurant.reservation_url && (
              <div className="pt-4 border-t">
                <a 
                  href={restaurant.reservation_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Make Reservation
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opening Hours */}
        {restaurant.opening_hours && (
          <Card>
            <CardHeader>
              <CardTitle>Opening Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyOpeningHours openingHours={restaurant.opening_hours} />
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {restaurant.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {restaurant.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
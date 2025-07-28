import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ChefHat, Globe, Heart, Phone, Clock, ExternalLink, Navigation, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { RestaurantDetailsSkeleton } from '@/components/skeletons/RestaurantDetailsSkeleton';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
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
  const fromFriendsActivity = searchParams.get('fromFriendsActivity') === 'true';
  const returnUrl = searchParams.get('returnUrl');
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
          placeId: restaurant.id
        }
      });

      if (error) {
        console.error('Error fetching Google Places details:', error);
        return restaurant;
      }

      if (data?.result) {
        const placeDetails = data.result;
        const updatedRestaurant = {
          ...restaurant,
          website: restaurant.website || placeDetails.website || '',
          phone_number: restaurant.phone_number || placeDetails.formatted_phone_number || '',
          opening_hours: restaurant.opening_hours || placeDetails.opening_hours?.weekday_text?.join('\n') || '',
          photos: restaurant.photos?.length > 0 ? restaurant.photos : placeDetails.photos?.map((photo: any) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=YOUR_API_KEY`) || []
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

      // Add to wishlist without copying photos
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
        photos: [], // Don't copy friend's photos
        website: restaurant.website,
        phone_number: restaurant.phone_number,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        reservable: restaurant.reservable,
        reservation_url: restaurant.reservation_url,
        opening_hours: restaurant.opening_hours,
        is_wishlist: true
      };

      const { error } = await supabase.from('restaurants').insert([restaurantData]);

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
    return <RestaurantDetailsSkeleton />;
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium">Restaurant not found</div>
            <Button 
              variant="outline" 
              onClick={() => {
                if (returnUrl) {
                  navigate(decodeURIComponent(returnUrl));
                } else {
                  navigate(-1);
                }
              }} 
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => {
              if (returnUrl) {
                navigate(decodeURIComponent(returnUrl));
              } else if (friendId) {
                navigate(`/friends/${friendId}`);
              } else if (fromFriendsActivity) {
                navigate('/search/friends');
              } else {
                navigate(-1);
              }
            }} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            
            {friendProfile && (
              <Badge variant="outline" className="text-sm">
                From {friendProfile.name || friendProfile.username}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Friend Notice */}
        {friendProfile && (
          <Card className="mb-6 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {friendProfile.name?.charAt(0) || friendProfile.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Shared by {friendProfile.name || friendProfile.username}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    From their restaurant collection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wishlist Notice */}
        {restaurant.is_wishlist && (
          <Card className="mb-6 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-purple-600 fill-current" />
                </div>
                <div>
                  <p className="font-medium text-purple-800 dark:text-purple-200">
                    On Wishlist
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    Not yet visited
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="space-y-8">
          {/* Restaurant Header */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight flex-1">
                  {restaurant.name}
                </h1>
                {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                  <div className="mt-1">
                    <MichelinStars stars={restaurant.michelin_stars} size="lg" readonly showLogo={true} />
                  </div>
                )}
              </div>
              <p className="text-lg text-muted-foreground">
                {restaurant.cuisine} • {restaurant.city}, {restaurant.country}
              </p>
            </div>

            {/* Rating and Basic Info */}
            {!restaurant.is_wishlist && (
              <div className="flex items-center gap-4 flex-wrap">
                {restaurant.rating && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={restaurant.rating} readonly size="md" />
                    <span className="font-medium">{restaurant.rating}/10</span>
                  </div>
                )}
                {restaurant.price_range && (
                  <Badge variant="outline">
                    <PriceRange priceRange={restaurant.price_range} />
                  </Badge>
                )}
                {restaurant.date_visited && (
                  <Badge variant="secondary">
                    <Calendar className="h-4 w-4 mr-1" />
                    Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Photos */}
          {!restaurant.is_wishlist && restaurant.photos && restaurant.photos.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <RestaurantPhotoCarousel photos={restaurant.photos} restaurantName={restaurant.name} />
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  onClick={addToWishlist}
                  disabled={isAddingToWishlist}
                  className="h-auto flex-col gap-2 py-4"
                  variant="outline"
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-sm">Add to Wishlist</span>
                </Button>

                {restaurant.phone_number && (
                  <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
                    <a href={`tel:${restaurant.phone_number}`}>
                      <Phone className="h-5 w-5" />
                      <span className="text-sm">Call</span>
                    </a>
                  </Button>
                )}

                {restaurant.website && (
                  <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-5 w-5" />
                      <span className="text-sm">Website</span>
                    </a>
                  </Button>
                )}

                <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
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
                  >
                    <Navigation className="h-5 w-5" />
                    <span className="text-sm">Directions</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Restaurant Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Address & Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium mb-1">Address</p>
                  <p className="text-muted-foreground">
                    {restaurant.address}<br />
                    {restaurant.city}, {restaurant.country}
                  </p>
                </div>
                
                {restaurant.phone_number && (
                  <div>
                    <p className="font-medium mb-1">Phone</p>
                    <p className="text-muted-foreground">{restaurant.phone_number}</p>
                  </div>
                )}

                {restaurant.website && (
                  <div>
                    <p className="font-medium mb-1">Website</p>
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Visit website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Restaurant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Restaurant Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium mb-1">Cuisine</p>
                  <p className="text-muted-foreground">{restaurant.cuisine}</p>
                </div>

                {restaurant.price_range && (
                  <div>
                    <p className="font-medium mb-1">Price Range</p>
                    <PriceRange priceRange={restaurant.price_range} />
                  </div>
                )}

                {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                  <div>
                    <p className="font-medium mb-1">Michelin Stars</p>
                    <MichelinStars stars={restaurant.michelin_stars} size="md" readonly showLogo={false} />
                  </div>
                )}

                <div>
                  <p className="font-medium mb-1">Status</p>
                  <Badge variant={restaurant.is_wishlist ? "secondary" : "default"}>
                    {restaurant.is_wishlist ? "Wishlist" : "Visited"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Opening Hours */}
          {restaurant.opening_hours && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Opening Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OpeningHoursDisplay hours={restaurant.opening_hours.split('\n')} />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {restaurant.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {restaurant.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {restaurant.latitude && restaurant.longitude && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-64 rounded-b-lg overflow-hidden">
                  <RestaurantLocationMap 
                    latitude={restaurant.latitude} 
                    longitude={restaurant.longitude} 
                    name={restaurant.name}
                    address={restaurant.address}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
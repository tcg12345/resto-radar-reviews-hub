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
        phone_number: restaurant.phone_number,
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                if (friendId) {
                  navigate('/', { 
                    state: { 
                      activeTab: 'friends',
                      viewFriendId: friendId 
                    } 
                  });
                } else {
                  navigate(-1);
                }
              }}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {friendId ? 'Back to Profile' : 'Back'}
            </Button>
            {friendProfile && (
              <Badge variant="secondary" className="text-sm">
                From {friendProfile.username || friendProfile.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <StarRating rating={restaurant.rating} readonly size="lg" />
                  <span className="text-3xl font-bold">{restaurant.rating?.toFixed(1)}</span>
                  <span className="text-muted-foreground">({restaurant.rating ? 'Rated' : 'Unrated'})</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-lg">
                <span className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full">
                  <ChefHat className="h-5 w-5 text-primary" />
                  <span className="font-medium">{restaurant.cuisine}</span>
                </span>
                <span className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-medium">{restaurant.city}, {restaurant.country}</span>
                </span>
                {restaurant.date_visited && (
                  <span className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                    <span className="font-medium">
                      Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 mt-6">
                {restaurant.price_range && (
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Price Range</div>
                    <PriceRange priceRange={restaurant.price_range} />
                  </div>
                )}
                {restaurant.michelin_stars > 0 && (
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Michelin</div>
                    <MichelinStars stars={restaurant.michelin_stars} />
                  </div>
                )}
                {restaurant.reservable && (
                  <div className="bg-card p-4 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Reservations</div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      Available
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Photos Section - Enhanced */}
            {restaurant.photos && restaurant.photos.length > 0 && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <RestaurantPhotoCarousel 
                    photos={restaurant.photos} 
                    restaurantName={restaurant.name} 
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Panel */}
          <div className="space-y-4">
            <Button
              onClick={addToWishlist}
              disabled={isAddingToWishlist}
              size="lg"
              className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-6 text-lg font-medium"
            >
              <Heart className="h-6 w-6 fill-current mr-2" />
              {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
            </Button>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(restaurant as any).phone_number && (
                  <a
                    href={`tel:${(restaurant as any).phone_number}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Phone className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Call Restaurant</span>
                  </a>
                )}
                
                {restaurant.website && (
                  <a
                    href={restaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Globe className="h-5 w-5 text-primary" />
                    <span className="font-medium">Visit Website</span>
                  </a>
                )}

                {restaurant.latitude && restaurant.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Navigation className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Get Directions</span>
                  </a>
                )}

                {restaurant.reservation_url && (
                  <a
                    href={restaurant.reservation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <ExternalLink className="h-5 w-5 text-orange-600" />
                    <span className="font-medium">Make Reservation</span>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Restaurant Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Restaurant Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Added on</span>
                  <span className="font-medium">
                    {new Date(restaurant.created_at).toLocaleDateString()}
                  </span>
                </div>
                {restaurant.updated_at && restaurant.updated_at !== restaurant.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span className="font-medium">
                      {new Date(restaurant.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline">{restaurant.is_wishlist ? 'Wishlist' : 'Visited'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Location Map - Full Width */}
        {restaurant.latitude && restaurant.longitude && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">Location & Map</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Full Address</h4>
                      <div className="text-muted-foreground">
                        <div>{restaurant.address}</div>
                        <div>{restaurant.city}</div>
                        <div>{restaurant.country}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Coordinates</h4>
                      <div className="text-muted-foreground text-sm">
                        <div>Lat: {restaurant.latitude}</div>
                        <div>Lng: {restaurant.longitude}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <RestaurantLocationMap
                    latitude={restaurant.latitude}
                    longitude={restaurant.longitude}
                    name={restaurant.name}
                    address={restaurant.address}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Information Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Restaurant Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Contact & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Full Address */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Full Address
                </h4>
                <div className="bg-muted/30 p-4 rounded-lg text-sm">
                  <div>{restaurant.address}</div>
                  <div>{restaurant.city}</div>
                  <div>{restaurant.country}</div>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Website
                </h4>
                {restaurant.website ? (
                  <a 
                    href={restaurant.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block bg-muted/30 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-primary">Visit Website</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new URL(restaurant.website).hostname}
                    </div>
                  </a>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg text-sm text-muted-foreground">
                    Website not available
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Phone Number
                </h4>
                {(restaurant as any).phone_number ? (
                  <a
                    href={`tel:${(restaurant as any).phone_number}`}
                    className="block bg-muted/30 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-sm font-medium text-green-600">{(restaurant as any).phone_number}</div>
                    <div className="text-xs text-muted-foreground mt-1">Tap to call</div>
                  </a>
                ) : (
                  <div className="bg-muted/20 p-4 rounded-lg text-sm text-muted-foreground">
                    Phone number not available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Opening Hours & Additional Info */}
          <div className="space-y-8">
            {restaurant.opening_hours && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <OpeningHoursDisplay hours={restaurant.opening_hours.split('\n')} />
                </CardContent>
              </Card>
            )}

            {/* Category Ratings */}
            {restaurant.category_ratings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Detailed Ratings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(restaurant.category_ratings).map(([category, rating]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <StarRating rating={rating as number} readonly size="sm" />
                        <span className="text-sm font-bold">{(rating as number)?.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reservation Info */}
            {restaurant.reservable && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Reservations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="font-medium">Reservations Available</span>
                    </div>
                    {restaurant.reservation_url && (
                      <a
                        href={restaurant.reservation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full" size="lg">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Make Reservation Online
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Notes Section - Full Width */}
        {restaurant.notes && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">Personal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-6 rounded-lg">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {restaurant.notes}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
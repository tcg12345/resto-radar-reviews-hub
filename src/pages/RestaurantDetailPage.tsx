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
    <>
      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (returnUrl) {
                      navigate(decodeURIComponent(returnUrl));
                    } else if (friendId) {
                      navigate(`/friends/${friendId}`);
                    } else if (fromFriendsActivity) {
                      navigate('/search/friends');
                    } else {
                      navigate(-1);
                    }
                  }}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="font-semibold text-lg truncate">{restaurant.name}</h1>
              </div>
              
              <Button
                onClick={addToWishlist}
                disabled={isAddingToWishlist}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="pb-6">
          {/* Friend Notice */}
          {friendProfile && (
            <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {friendProfile.name?.charAt(0) || friendProfile.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    From {friendProfile.name || friendProfile.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Wishlist Notice */}
          {restaurant.is_wishlist && (
            <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Heart className="h-4 w-4 text-purple-600 fill-current" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    On Wishlist
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-300">
                    Not yet visited
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Hero Image */}
          {!restaurant.is_wishlist && restaurant.photos && restaurant.photos.length > 0 && (
            <div className="relative h-48 bg-muted">
              <img
                src={restaurant.photos[0]}
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Main Info */}
          <div className="p-4 space-y-4">
            {/* Restaurant Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold flex-1 leading-tight">{restaurant.name}</h1>
                {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                  <div>
                    <MichelinStars stars={restaurant.michelin_stars} size="md" readonly showLogo={true} />
                  </div>
                )}
              </div>
              <p className="text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
            </div>

            {/* Rating and Badges */}
            {!restaurant.is_wishlist && (
              <div className="flex items-center gap-2 flex-wrap">
                {restaurant.rating && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating}/10
                  </Badge>
                )}
                {restaurant.price_range && (
                  <Badge variant="outline">
                    <PriceRange priceRange={restaurant.price_range} />
                  </Badge>
                )}
                {restaurant.date_visited && (
                  <Badge variant="secondary" className="text-xs">
                    Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              {restaurant.phone_number && (
                <Button asChild variant="outline" className="h-16 flex-col gap-1">
                  <a href={`tel:${restaurant.phone_number}`}>
                    <Phone className="h-5 w-5" />
                    <span className="text-sm">Call</span>
                  </a>
                </Button>
              )}

              {restaurant.website && (
                <Button asChild variant="outline" className="h-16 flex-col gap-1">
                  <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-5 w-5" />
                    <span className="text-sm">Website</span>
                  </a>
                </Button>
              )}

              <Button asChild variant="outline" className="h-16 flex-col gap-1">
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

              <Button
                onClick={addToWishlist}
                disabled={isAddingToWishlist}
                variant="outline"
                className="h-16 flex-col gap-1"
              >
                <Heart className="h-5 w-5" />
                <span className="text-sm">Wishlist</span>
              </Button>
            </div>

            {/* Address */}
            <div className="pt-4 border-t">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium mb-1">Address</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {restaurant.address}<br />
                    {restaurant.city}, {restaurant.country}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            {(restaurant.phone_number || restaurant.website) && (
              <div className="space-y-3">
                {restaurant.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
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
                    <div>
                      <p className="font-medium">Website</p>
                      <a 
                        href={restaurant.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Visit website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Restaurant Details */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-3">
                <ChefHat className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">Cuisine</p>
                  <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                </div>
              </div>

              {restaurant.price_range && (
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 text-muted-foreground shrink-0 flex items-center justify-center text-lg">$</span>
                  <div>
                    <p className="font-medium">Price Range</p>
                    <PriceRange priceRange={restaurant.price_range} />
                  </div>
                </div>
              )}

              {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 shrink-0"></div>
                  <div>
                    <p className="font-medium">Michelin Stars</p>
                    <MichelinStars stars={restaurant.michelin_stars} size="sm" readonly showLogo={false} />
                  </div>
                </div>
              )}
            </div>

            {/* Opening Hours */}
            {restaurant.opening_hours && (
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Opening Hours</p>
                    <OpeningHoursDisplay hours={restaurant.opening_hours.split('\n')} />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {restaurant.notes && (
              <div className="pt-4 border-t">
                <p className="font-medium mb-2">Notes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {restaurant.notes}
                </p>
              </div>
            )}

            {/* Additional Photos */}
            {!restaurant.is_wishlist && restaurant.photos && restaurant.photos.length > 1 && (
              <div className="pt-4 border-t">
                <p className="font-medium mb-3">More Photos</p>
                <div className="grid grid-cols-2 gap-2">
                  {restaurant.photos.slice(1, 5).map((photo, index) => (
                    <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={photo}
                        alt={`${restaurant.name} photo ${index + 2}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map */}
            {restaurant.latitude && restaurant.longitude && (
              <div className="pt-4 border-t">
                <p className="font-medium mb-3">Location</p>
                <div className="h-48 rounded-lg overflow-hidden">
                  <RestaurantLocationMap 
                    latitude={restaurant.latitude} 
                    longitude={restaurant.longitude} 
                    name={restaurant.name}
                    address={restaurant.address}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Full Page */}
      <div className="hidden md:block min-h-screen bg-background">
        {/* Full Width Hero Section */}
        <div className="relative h-80 bg-gradient-to-r from-slate-900 to-slate-700">
          {!restaurant.is_wishlist && restaurant.photos && restaurant.photos.length > 0 && (
            <div className="absolute inset-0">
              <img
                src={restaurant.photos[0]}
                alt={restaurant.name}
                className="w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30"></div>
            </div>
          )}
          
          {/* Hero Content */}
          <div className="relative z-10 h-full flex items-center">
            <div className="w-full px-8">
              {/* Navigation */}
              <div className="mb-6">
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
                }} className="text-white hover:bg-white/20 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>

              {/* Hero Title */}
              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-5xl font-bold text-white leading-tight">
                    {restaurant.name}
                  </h1>
                  {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                    <div>
                      <MichelinStars stars={restaurant.michelin_stars} size="lg" readonly showLogo={true} />
                    </div>
                  )}
                </div>
                
                <p className="text-xl text-white/90 mb-6">
                  {restaurant.cuisine} • {restaurant.city}, {restaurant.country}
                </p>

                {/* Hero Badges */}
                {!restaurant.is_wishlist && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {restaurant.rating && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-base px-4 py-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-2" />
                        {restaurant.rating}/10
                      </Badge>
                    )}
                    {restaurant.price_range && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-base px-4 py-2">
                        <PriceRange priceRange={restaurant.price_range} />
                      </Badge>
                    )}
                    {restaurant.date_visited && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-base px-4 py-2">
                        <Calendar className="h-4 w-4 mr-2" />
                        Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Friend/Wishlist Notices */}
                {friendProfile && (
                  <div className="mt-6">
                    <Badge className="bg-blue-500/80 text-white border-blue-400/50 backdrop-blur-sm text-base px-4 py-2">
                      Shared by {friendProfile.name || friendProfile.username}
                    </Badge>
                  </div>
                )}

                {restaurant.is_wishlist && (
                  <div className="mt-6">
                    <Badge className="bg-purple-500/80 text-white border-purple-400/50 backdrop-blur-sm text-base px-4 py-2">
                      <Heart className="h-4 w-4 mr-2 fill-current" />
                      On Wishlist
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex">
          {/* Main Content Area */}
          <div className="flex-1 p-8 pr-4">
            <div className="space-y-8">
              
              {/* Photo Gallery */}
              {!restaurant.is_wishlist && restaurant.photos && restaurant.photos.length > 0 && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">Photo Gallery</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <RestaurantPhotoCarousel photos={restaurant.photos} restaurantName={restaurant.name} />
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions - Moved under photo gallery */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Heart className="h-6 w-6" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-6">
                    <Button
                      onClick={addToWishlist}
                      disabled={isAddingToWishlist}
                      className="h-24 flex-col gap-3 py-6 bg-gradient-to-br from-pink-400/60 to-violet-500/60 hover:from-pink-500/70 hover:to-violet-600/70 text-white border-0 backdrop-blur-sm text-base"
                      variant="outline"
                    >
                      <Heart className="h-6 w-6" />
                      <span>Add to Wishlist</span>
                    </Button>

                    {restaurant.phone_number && (
                      <Button asChild variant="outline" className="h-24 flex-col gap-3 py-6 bg-gradient-to-br from-blue-400/60 to-cyan-500/60 hover:from-blue-500/70 hover:to-cyan-600/70 text-white border-0 backdrop-blur-sm text-base">
                        <a href={`tel:${restaurant.phone_number}`}>
                          <Phone className="h-6 w-6" />
                          <span>Call Now</span>
                        </a>
                      </Button>
                    )}

                    {restaurant.website && (
                      <Button asChild variant="outline" className="h-24 flex-col gap-3 py-6 bg-gradient-to-br from-green-400/60 to-emerald-500/60 hover:from-green-500/70 hover:to-emerald-600/70 text-white border-0 backdrop-blur-sm text-base">
                        <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="h-6 w-6" />
                          <span>Website</span>
                        </a>
                      </Button>
                    )}

                    <Button asChild variant="outline" className="h-24 flex-col gap-3 py-6 bg-gradient-to-br from-orange-400/60 to-red-500/60 hover:from-orange-500/70 hover:to-red-600/70 text-white border-0 backdrop-blur-sm text-base">
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
                        <Navigation className="h-6 w-6" />
                        <span>Directions</span>
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Restaurant Details Grid */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* About */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      About This Restaurant
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="font-semibold mb-2 text-lg">Cuisine</p>
                      <p className="text-muted-foreground">{restaurant.cuisine}</p>
                    </div>

                    {restaurant.price_range && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Price Range</p>
                        <div className="text-lg">
                          <PriceRange priceRange={restaurant.price_range} />
                        </div>
                      </div>
                    )}

                    {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Recognition</p>
                        <MichelinStars stars={restaurant.michelin_stars} size="lg" readonly showLogo={true} />
                      </div>
                    )}

                    {!restaurant.is_wishlist && restaurant.rating && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">My Rating</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex-shrink-0">
                            <StarRating rating={restaurant.rating} readonly size="md" />
                          </div>
                          <span className="text-xl font-bold">{restaurant.rating}/10</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="font-semibold mb-2 text-lg">Status</p>
                      <Badge variant={restaurant.is_wishlist ? "secondary" : "default"} className="text-base px-3 py-1">
                        {restaurant.is_wishlist ? "Wishlist Item" : "Visited Restaurant"}
                      </Badge>
                    </div>

                    {restaurant.date_visited && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Visit Date</p>
                        <p className="text-muted-foreground">{new Date(restaurant.date_visited).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Location & Contact */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Location & Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="font-semibold mb-2 text-lg">Address</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {restaurant.address}<br />
                        {restaurant.city}, {restaurant.country}
                      </p>
                    </div>
                    
                    {restaurant.phone_number && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Phone</p>
                        <a 
                          href={`tel:${restaurant.phone_number}`}
                          className="text-primary hover:underline text-lg"
                        >
                          {restaurant.phone_number}
                        </a>
                      </div>
                    )}

                    {restaurant.website && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Website</p>
                        <a 
                          href={restaurant.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-2 text-lg"
                        >
                          Visit Website
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}

                    {restaurant.reservable && (
                      <div>
                        <p className="font-semibold mb-2 text-lg">Reservations</p>
                        {restaurant.reservation_url ? (
                          <a 
                            href={restaurant.reservation_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            Make a Reservation
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <p className="text-muted-foreground">Reservations accepted</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Opening Hours */}
              {restaurant.opening_hours && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Clock className="h-6 w-6" />
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
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl">Personal Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {restaurant.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Map */}
              {restaurant.latitude && restaurant.longitude && (
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <MapPin className="h-6 w-6" />
                      Location Map
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-96 rounded-b-lg overflow-hidden">
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

          {/* Sidebar */}
          <div className="w-96 bg-muted/30 p-6 border-l flex-shrink-0">
            <div className="sticky top-6 space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">Cuisine</span>
                    <span className="text-muted-foreground">{restaurant.cuisine}</span>
                  </div>
                  
                  {restaurant.price_range && (
                    <div className="flex justify-between">
                      <span className="font-medium">Price</span>
                      <PriceRange priceRange={restaurant.price_range} />
                    </div>
                  )}

                  {!restaurant.is_wishlist && restaurant.rating && (
                    <div className="flex justify-between">
                      <span className="font-medium">Rating</span>
                      <span className="text-muted-foreground">{restaurant.rating}/10</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="font-medium">Location</span>
                    <span className="text-muted-foreground">{restaurant.city}</span>
                  </div>

                  {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Michelin</span>
                      <MichelinStars stars={restaurant.michelin_stars} size="sm" readonly showLogo={false} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Additional Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">More Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigator.share?.({
                      title: restaurant.name,
                      text: `Check out ${restaurant.name} - ${restaurant.cuisine} restaurant in ${restaurant.city}`,
                      url: window.location.href
                    })}
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Share Restaurant
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(
                        `${restaurant.name} ${restaurant.city} reviews`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Find Reviews
                    </a>
                  </Button>

                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `restaurants near ${restaurant.name} ${restaurant.city}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Nearby Restaurants
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Timeline */}
              {restaurant.created_at && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium">Added to collection</p>
                      <p className="text-muted-foreground">
                        {new Date(restaurant.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {restaurant.date_visited && (
                      <div className="text-sm">
                        <p className="font-medium">Date visited</p>
                        <p className="text-muted-foreground">
                          {new Date(restaurant.date_visited).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {restaurant.updated_at && restaurant.updated_at !== restaurant.created_at && (
                      <div className="text-sm">
                        <p className="font-medium">Last updated</p>
                        <p className="text-muted-foreground">
                          {new Date(restaurant.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
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
  const {
    restaurantId
  } = useParams<{
    restaurantId: string;
  }>();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const fromFriendsActivity = searchParams.get('fromFriendsActivity') === 'true';
  const returnUrl = searchParams.get('returnUrl');
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const fetchGooglePlacesDetails = async (restaurant: any) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          type: 'details',
          placeId: restaurant.id // Assuming restaurant.id is the Google Place ID
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
          photos: restaurant.photos?.length > 0 ? restaurant.photos : placeDetails.photos?.map((photo: any) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=YOUR_API_KEY`) || []
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
        const {
          data: restaurantData,
          error: restaurantError
        } = await supabase.from('restaurants').select('*').eq('id', restaurantId).eq('user_id', friendId).single();
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
        const {
          data: profileData,
          error: profileError
        } = await supabase.from('profiles').select('id, username, name, avatar_url').eq('id', friendId).single();
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
      const {
        data: existingRestaurant,
        error: checkError
      } = await supabase.from('restaurants').select('id').eq('user_id', user.id).eq('name', restaurant.name).eq('is_wishlist', true).maybeSingle();
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
        photos: [],
        // Don't copy friend's photos
        website: restaurant.website,
        phone_number: restaurant.phone_number,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        reservable: restaurant.reservable,
        reservation_url: restaurant.reservation_url,
        opening_hours: restaurant.opening_hours,
        is_wishlist: true
      };
      const {
        error
      } = await supabase.from('restaurants').insert([restaurantData]);
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
    return <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium">Restaurant not found</div>
            <Button variant="outline" onClick={() => {
              if (returnUrl) {
                navigate(decodeURIComponent(returnUrl));
              } else {
                navigate(-1);
              }
            }} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => {
            if (returnUrl) {
              // Use the returnUrl to navigate back with filters preserved
              navigate(decodeURIComponent(returnUrl));
            } else if (fromFriendsActivity) {
              navigate('/search/friends');
            } else if (friendId) {
              navigate('/', {
                state: {
                  activeTab: 'friends',
                  viewFriendId: friendId
                }
              });
            } else {
              navigate(-1);
            }
          }} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {returnUrl ? 'Back to Friends Activity' : fromFriendsActivity ? 'Back to Friends Activity' : friendId ? 'Back to Profile' : 'Back'}
            </Button>
            {friendProfile && <Badge variant="secondary" className="text-sm">
                From {friendProfile.username || friendProfile.name}
              </Badge>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Data Source and Wishlist Notices */}
        {friendProfile && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Data Source Notice */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {friendProfile.name?.charAt(0) || friendProfile.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      Restaurant data shared by {friendProfile.name || friendProfile.username}
                    </p>
                    <p className="text-blue-600 dark:text-blue-300 text-sm">
                      This information comes from their personal restaurant collection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wishlist Notice */}
            {restaurant.is_wishlist && (
              <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 border-purple-200/50 dark:border-purple-800/50 shadow-lg backdrop-blur-sm animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                      <Heart className="h-6 w-6 text-white fill-current animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
                        Wishlist Restaurant
                      </h3>
                      <p className="text-purple-700/80 dark:text-purple-300/80 font-medium">
                        This restaurant is in {friendProfile.name || friendProfile.username}'s wishlist
                      </p>
                      <p className="text-purple-600/70 dark:text-purple-400/70 text-sm mt-1">
                        They haven't visited yet • No rating or photos available
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        {/* Hero Section - Dynamic layout based on wishlist status */}
        <div className={restaurant.is_wishlist ? "space-y-6" : "grid lg:grid-cols-5 gap-6"}>
          {/* Main Info - Full width for wishlist, partial for rated */}
          <div className={restaurant.is_wishlist ? "space-y-4" : "lg:col-span-3 space-y-4"}>
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-relaxed">
                {restaurant.name}
              </h1>
              
              {/* Rating Bar - Only show for rated restaurants */}
              {!restaurant.is_wishlist && (
                <div className="flex items-center gap-4 mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border">
                  <div className="flex items-center gap-3">
                    <StarRating rating={restaurant.rating} readonly size="lg" />
                  </div>
                  {restaurant.michelin_stars > 0 && <div className="ml-auto">
                      <MichelinStars stars={restaurant.michelin_stars} />
                    </div>}
                </div>
              )}
              
              {/* Quick Info Tags */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="text-sm px-3 py-1 bg-primary/10">
                  <ChefHat className="h-4 w-4 mr-2" />
                  {restaurant.cuisine}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  {restaurant.city}, {restaurant.country}
                </Badge>
                {restaurant.price_range && <Badge variant="outline" className="text-sm px-3 py-1">
                    <PriceRange priceRange={restaurant.price_range} />
                  </Badge>}
                {restaurant.date_visited && <Badge variant="outline" className="text-sm px-3 py-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(restaurant.date_visited).toLocaleDateString()}
                  </Badge>}
              </div>

              {/* Address */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{restaurant.address}</div>
                      <div className="text-sm text-muted-foreground">{restaurant.city}, {restaurant.country}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Photos Section - Only show for rated restaurants */}
            {!restaurant.is_wishlist && (
              restaurant.photos && restaurant.photos.length > 0 ? (
                <Card className="overflow-hidden animate-fade-in">
                  <CardContent className="p-0">
                    <RestaurantPhotoCarousel photos={restaurant.photos} restaurantName={restaurant.name} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden animate-fade-in">
                  <CardContent className="p-0">
                    <div className="h-96 lg:h-[500px] bg-muted/30 flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <div className="text-lg font-medium mb-2">No Photos Added</div>
                        <div className="text-sm">Photos will appear here when available</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Action Panel - Only show for rated restaurants */}
          {!restaurant.is_wishlist && (
            <div className="lg:col-span-2 space-y-4 animate-fade-in">
              <Button onClick={addToWishlist} disabled={isAddingToWishlist} size="lg" className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 text-base font-medium hover-scale">
                <Heart className="h-5 w-5 fill-current mr-2" />
                {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
              </Button>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 gap-3">
                {(restaurant as any).phone_number && <a href={`tel:${(restaurant as any).phone_number}`} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors hover-scale">
                    <Phone className="h-8 w-8 text-green-600" />
                    <span className="text-sm font-medium text-center">Call</span>
                  </a>}
                
                {restaurant.website && <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors hover-scale">
                    <Globe className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium text-center">Website</span>
                  </a>}

                {restaurant.latitude && restaurant.longitude && <a href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors hover-scale">
                    <Navigation className="h-8 w-8 text-blue-600" />
                    <span className="text-sm font-medium text-center">Directions</span>
                  </a>}

                <a href={`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' reviews')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors hover-scale">
                  <Star className="h-8 w-8 text-yellow-600" />
                  <span className="text-sm font-medium text-center">Reviews</span>
                </a>
              </div>

              {/* Restaurant Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Restaurant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added</span>
                    <span className="font-medium">
                      {new Date(restaurant.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-xs">
                      {restaurant.is_wishlist ? 'Wishlist' : 'Visited'}
                    </Badge>
                  </div>
                  {restaurant.updated_at && restaurant.updated_at !== restaurant.created_at && <div className="flex justify-between">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="font-medium">
                        {new Date(restaurant.updated_at).toLocaleDateString()}
                      </span>
                    </div>}
                </CardContent>
              </Card>

              {/* Opening Hours - Compact */}
              {restaurant.opening_hours && <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <OpeningHoursDisplay hours={restaurant.opening_hours.split('\n')} />
                  </CardContent>
                </Card>}
            </div>
          )}
        </div>

        {/* Wishlist Actions - Elegant full width section */}
        {restaurant.is_wishlist && (
          <div className="space-y-8 animate-fade-in">
            {/* Combined Action Row */}
            <div className="grid lg:grid-cols-2 gap-6">
            {/* Add to Wishlist Card - Left Side */}
            <Card className="h-full bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-rose-950/30 dark:via-pink-950/30 dark:to-purple-950/30 border-rose-200/50 dark:border-rose-800/50 shadow-xl backdrop-blur-sm overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-purple-500/5" />
              <CardContent className="relative px-8 h-full flex items-center justify-center">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl shadow-lg">
                    <Heart className="h-6 w-6 text-white fill-current" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-rose-700 to-purple-700 dark:from-rose-300 dark:to-purple-300 bg-clip-text text-transparent">
                    Add to Your Wishlist
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Save this restaurant to your own wishlist and get notified about updates
                  </p>
                  <Button 
                    onClick={addToWishlist} 
                    disabled={isAddingToWishlist} 
                    size="default" 
                    className="bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover-scale border-0"
                  >
                    <Heart className="h-4 w-4 fill-current mr-2" />
                    {isAddingToWishlist ? 'Adding to Wishlist...' : 'Add to My Wishlist'}
                  </Button>
                </div>
              </CardContent>
            </Card>

              {/* Quick Actions - Right Side */}
              <Card className="h-full shadow-lg border-0 bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-950/50 dark:to-zinc-950/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {(restaurant.phone_number || (restaurant as any).phone_number) && (
                      <a 
                        href={`tel:${restaurant.phone_number || (restaurant as any).phone_number}`} 
                        className="group flex flex-col items-center gap-2 p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 hover:from-green-100 dark:hover:from-green-950/50 hover:to-emerald-100 dark:hover:to-emerald-950/50 transition-all duration-300 hover-scale shadow-md hover:shadow-lg border border-green-200/30 dark:border-green-800/30"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                          <Phone className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-green-700 dark:text-green-300 group-hover:text-green-800 dark:group-hover:text-green-200 transition-colors text-center">Call</span>
                      </a>
                    )}
                  
                  {restaurant.website && (
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group flex flex-col items-center gap-2 p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 hover:from-blue-100 dark:hover:from-blue-950/50 hover:to-indigo-100 dark:hover:to-indigo-950/50 transition-all duration-300 hover-scale shadow-md hover:shadow-lg border border-blue-200/30 dark:border-blue-800/30"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200 transition-colors text-center">Website</span>
                    </a>
                  )}

                  {restaurant.latitude && restaurant.longitude && (
                    <a 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="group flex flex-col items-center gap-2 p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 hover:from-orange-100 dark:hover:from-orange-950/50 hover:to-amber-100 dark:hover:to-amber-950/50 transition-all duration-300 hover-scale shadow-md hover:shadow-lg border border-orange-200/30 dark:border-orange-800/30"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                        <Navigation className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-semibold text-orange-700 dark:text-orange-300 group-hover:text-orange-800 dark:group-hover:text-orange-200 transition-colors text-center">Directions</span>
                    </a>
                  )}

                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' reviews')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group flex flex-col items-center gap-2 p-6 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 hover:from-yellow-100 dark:hover:from-yellow-950/50 hover:to-orange-100 dark:hover:to-orange-950/50 transition-all duration-300 hover-scale shadow-md hover:shadow-lg border border-yellow-200/30 dark:border-yellow-800/30"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                      <Star className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 group-hover:text-yellow-800 dark:group-hover:text-yellow-200 transition-colors text-center">Reviews</span>
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

            {/* Opening Hours Card */}
            {restaurant.opening_hours && (
              <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-3 bg-gradient-to-r from-indigo-700 to-blue-700 dark:from-indigo-300 dark:to-blue-300 bg-clip-text text-transparent">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <OpeningHoursDisplay hours={restaurant.opening_hours.split('\n')} />
                </CardContent>
              </Card>
            )}
          </div>
        )}


        {/* Personal Notes - Prominent if exists */}
        {restaurant.notes && <Card className="animate-fade-in border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-xl">Personal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {restaurant.notes}
                </p>
              </div>
            </CardContent>
          </Card>}

        {/* Location & Interactive Map */}
        {restaurant.latitude && restaurant.longitude && <div className="animate-fade-in">
            <Card>
              <CardContent className="p-0 space-y-0">
                {/* Address Information Header */}
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Location & Address
                      </h3>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">
                          {restaurant.name}
                        </p>
                        <p className="text-muted-foreground">
                          {restaurant.address}
                        </p>
                        <p className="text-muted-foreground">
                          {restaurant.city}, {restaurant.country}
                        </p>
                      </div>
                    </div>
                    <Button variant="default" size="sm" asChild className="shrink-0">
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer">
                        <Navigation className="h-4 w-4 mr-2" />
                        Get Directions
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Interactive Map */}
                <div className="relative overflow-hidden rounded-b-lg">
                  <div className="absolute top-4 left-4 z-10">
                    <div className="bg-background/95 backdrop-blur-sm rounded-md shadow-sm border px-3 py-2">
                      <p className="text-sm font-medium text-foreground">Interactive Map</p>
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-background/95 backdrop-blur-sm rounded-md shadow-sm border px-3 py-2">
                      <p className="text-xs text-muted-foreground">Drag to explore</p>
                    </div>
                  </div>

                  <div className="h-80 w-full [&_>_*]:!rounded-none [&_canvas]:!rounded-none [&_>_*]:!h-full">
                    <RestaurantLocationMap latitude={restaurant.latitude} longitude={restaurant.longitude} name={restaurant.name} address={restaurant.address} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>}
      </div>
    </div>;
}
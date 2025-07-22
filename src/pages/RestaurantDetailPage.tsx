import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, ChefHat, Globe, Heart, Phone, Clock, ExternalLink, Navigation } from 'lucide-react';
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
  const {
    restaurantId
  } = useParams<{
    restaurantId: string;
  }>();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
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
    return <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading restaurant details...</div>
        </div>
      </div>;
  }
  if (!restaurant) {
    return <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg font-medium">Restaurant not found</div>
            <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
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
          }} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {friendId ? 'Back to Profile' : 'Back'}
            </Button>
            {friendProfile && <Badge variant="secondary" className="text-sm">
                From {friendProfile.username || friendProfile.name}
              </Badge>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Data Source Notice */}
        {friendProfile && (
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
        )}
        {/* Hero Section - Compact */}
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Main Info - More space */}
          <div className="lg:col-span-3 space-y-4">
            <div className="animate-fade-in">
              <h1 className="text-4xl lg:text-5xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight">
                {restaurant.name}
              </h1>
              
              {/* Rating Bar */}
              <div className="flex items-center gap-4 mb-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border">
                <div className="flex items-center gap-3">
                  <StarRating rating={restaurant.rating} readonly size="lg" />
                  
                  
                </div>
                {restaurant.michelin_stars > 0 && <div className="ml-auto">
                    <MichelinStars stars={restaurant.michelin_stars} />
                  </div>}
              </div>
              
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
                {restaurant.reservable && <Badge className="text-sm px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    Reservations Available
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

            {/* Photos Section */}
            {restaurant.photos && restaurant.photos.length > 0 && <Card className="overflow-hidden animate-fade-in">
                <CardContent className="p-0">
                  <RestaurantPhotoCarousel photos={restaurant.photos} restaurantName={restaurant.name} />
                </CardContent>
              </Card>}
          </div>

          {/* Action Panel - Compact */}
          <div className="lg:col-span-2 space-y-4 animate-fade-in">
            <Button onClick={addToWishlist} disabled={isAddingToWishlist} size="lg" className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-4 text-base font-medium hover-scale">
              <Heart className="h-5 w-5 fill-current mr-2" />
              {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
            </Button>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              {(restaurant as any).phone_number && <a href={`tel:${(restaurant as any).phone_number}`} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors hover-scale">
                  <Phone className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-center">Call</span>
                </a>}
              
              {restaurant.website && <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors hover-scale">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-center">Website</span>
                </a>}

              {restaurant.latitude && restaurant.longitude && <a href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors hover-scale">
                  <Navigation className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-center">Directions</span>
                </a>}

              {restaurant.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors hover-scale">
                  <ExternalLink className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-center">Reserve</span>
                </a>}
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
        </div>

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

        {/* Enhanced Information Grid */}
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Contact Details */}
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Phone */}
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4 text-green-600" />
                  Phone
                </h4>
                {(restaurant as any).phone_number ? <a href={`tel:${(restaurant as any).phone_number}`} className="block bg-green-50 dark:bg-green-900/20 p-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                    <div className="font-medium text-green-700 dark:text-green-400">
                      {(restaurant as any).phone_number}
                    </div>
                    <div className="text-xs text-muted-foreground">Tap to call</div>
                  </a> : <div className="bg-muted/20 p-3 rounded-lg text-sm text-muted-foreground">
                    Not available
                  </div>}
              </div>

              {/* Website */}
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Website
                </h4>
                {restaurant.website ? <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="block bg-primary/10 p-3 rounded-lg hover:bg-primary/20 transition-colors">
                    <div className="font-medium text-primary">Visit Website</div>
                    <div className="text-xs text-muted-foreground">
                      {new URL(restaurant.website).hostname}
                    </div>
                  </a> : <div className="bg-muted/20 p-3 rounded-lg text-sm text-muted-foreground">
                    Not available
                  </div>}
              </div>
            </CardContent>
          </Card>

          {/* Category Ratings */}
          {restaurant.category_ratings ? <Card className="hover-scale">
              <CardHeader>
                <CardTitle className="text-lg">Detailed Ratings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(restaurant.category_ratings).map(([category, rating]) => <div key={category} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{category}</span>
                    <div className="flex items-center gap-2">
                      <StarRating rating={rating as number} readonly size="sm" />
                      <span className="text-sm font-bold">{(rating as number)?.toFixed(1)}</span>
                    </div>
                  </div>)}
              </CardContent>
            </Card> : <Card className="hover-scale">
              <CardHeader>
                <CardTitle className="text-lg">Restaurant Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Cuisine Style</span>
                    <Badge variant="secondary">{restaurant.cuisine}</Badge>
                  </div>
                  {restaurant.price_range && <div className="flex items-center justify-between">
                      <span>Price Range</span>
                      <PriceRange priceRange={restaurant.price_range} />
                    </div>}
                  {restaurant.michelin_stars > 0 && <div className="flex items-center justify-between">
                      <span>Michelin Stars</span>
                      <MichelinStars stars={restaurant.michelin_stars} />
                    </div>}
                  <div className="flex items-center justify-between">
                    <span>Location</span>
                    <span className="text-sm text-muted-foreground">{restaurant.city}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reservations</span>
                    <Badge variant={restaurant.reservable ? "default" : "outline"}>
                      {restaurant.reservable ? "Available" : "Not Available"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>}

          {/* Location & Map */}
          {restaurant.latitude && restaurant.longitude && <Card className="hover-scale">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted/30 p-3 rounded-lg text-sm">
                    <div className="font-medium">{restaurant.address}</div>
                    <div className="text-muted-foreground">{restaurant.city}, {restaurant.country}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>Lat: {restaurant.latitude}</div>
                    <div>Lng: {restaurant.longitude}</div>
                  </div>
                </div>
              </CardContent>
            </Card>}
        </div>

        {/* Full Width Map */}
        {restaurant.latitude && restaurant.longitude && <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Interactive Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-96">
                <RestaurantLocationMap latitude={restaurant.latitude} longitude={restaurant.longitude} name={restaurant.name} address={restaurant.address} />
              </div>
            </CardContent>
          </Card>}

        {/* Reservation Section - Full Width if available */}
        {restaurant.reservable && <Card className="animate-fade-in bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <ExternalLink className="h-6 w-6" />
                Make a Reservation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-orange-700 dark:text-orange-300">
                  This restaurant accepts reservations. Book your table in advance to ensure availability.
                </p>
                {restaurant.reservation_url && <a href={restaurant.reservation_url} target="_blank" rel="noopener noreferrer" className="inline-block">
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white" size="lg">
                      <ExternalLink className="h-5 w-5 mr-2" />
                      Reserve Online Now
                    </Button>
                  </a>}
              </div>
            </CardContent>
          </Card>}
      </div>
    </div>;
}
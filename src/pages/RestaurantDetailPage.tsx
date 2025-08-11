import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';

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
  google_place_id?: string;
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
  const location = useLocation();
  
  const [restaurant, setRestaurant] = useState<any>((location.state as any)?.restaurantPreview || null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(!(location.state as any)?.restaurantPreview);

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

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// Helper function to check if a string looks like a Google Place ID
const isValidGooglePlaceId = (str: string) => {
  // Most Google Place IDs start with "ChI"; also exclude known internal placeholders like "grubby_"
  return str.startsWith('ChI');
};

useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId) return;
      
      setIsLoading(true);
      try {
        // Check if restaurantId is a UUID (user's restaurant) or a Google Place ID
        if (isValidUUID(restaurantId)) {
          // Fetch from user's restaurants table
          let restaurantQuery = supabase
            .from('restaurants')
            .select('*')
            .eq('id', restaurantId);

          if (friendId) {
            restaurantQuery = restaurantQuery.eq('user_id', friendId);
          } else {
            restaurantQuery = restaurantQuery.eq('user_id', user?.id);
          }

          const { data: restaurantData, error: restaurantError } = await restaurantQuery.single();

          if (restaurantError) {
            console.error('Error fetching restaurant:', restaurantError);
            toast('Failed to load restaurant details');
            return;
          }

          // Set as-is and let the details component load any extras lazily
          setRestaurant(restaurantData);
        } else {
          // It's an identifier that's not a UUID
          console.log('Fetching restaurant by identifier:', restaurantId);

          if (isValidGooglePlaceId(restaurantId)) {
            // Treat as Google Place ID - fetch from Google Places API
            try {
              const { data, error } = await supabase.functions.invoke('google-places-search', {
                body: { placeId: restaurantId, type: 'details' }
              });

              if (error) {
                console.error('Error fetching place details:', error);
                toast('Failed to load restaurant details');
                return;
              }

              if (data?.result) {
                // Convert Google Places data to our restaurant format
                const googlePlaceData = {
                  id: restaurantId,
                  name: data.result.name,
                  address: data.result.formatted_address,
                  latitude: data.result.geometry?.location?.lat,
                  longitude: data.result.geometry?.location?.lng,
                  phone_number: data.result.formatted_phone_number,
                  website: data.result.website,
                  opening_hours: data.result.opening_hours?.weekday_text?.join('\n') || '',
                  rating: data.result.rating,
                  price_level: data.result.price_level,
                  photos: [], // avoid raw photo objects; rely on community/user photos
                  google_place_id: restaurantId,
                  user_id: null, // This is not a user's restaurant
                  is_wishlist: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                
                setRestaurant(googlePlaceData);
              } else {
                toast('Restaurant not found');
              }
            } catch (apiError) {
              console.error('Error calling Google Places API:', apiError);
              toast('Failed to load restaurant details');
            }
          } else {
            // Fallback: treat as internal placeholder (e.g., grubby_*) and load from our DB by google_place_id
            let placeholderQuery = supabase
              .from('restaurants')
              .select('*')
              .eq('google_place_id', restaurantId);

            if (friendId) {
              placeholderQuery = placeholderQuery.eq('user_id', friendId);
            } else {
              placeholderQuery = placeholderQuery.eq('user_id', user?.id);
            }

            const { data: placeholderRestaurant, error: placeholderError } = await (placeholderQuery as any).maybeSingle();

            if (placeholderError) {
              console.error('Error loading placeholder restaurant:', placeholderError);
              toast('Failed to load restaurant details');
              return;
            }

            if (placeholderRestaurant) {
              setRestaurant(placeholderRestaurant);
            } else {
              toast('Restaurant not found');
            }
          }
        }

        // Fetch friend profile only if friendId exists
        if (friendId) {
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
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Failed to load restaurant details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [restaurantId, friendId, user?.id]);

  const handleBack = () => {
    if (returnUrl) {
      navigate(decodeURIComponent(returnUrl));
    } else if (friendId) {
      navigate(`/friends/${friendId}`);
    } else if (fromFriendsActivity) {
      navigate('/search/friends');
    } else {
      navigate(-1);
    }
  };

  if (!restaurant) {
    return (
      <UnifiedRestaurantDetails
        restaurant={{} as any}
        isLoading={true}
        onBack={handleBack}
      />
    );
  }

  // Transform restaurant data to unified format
  const unifiedRestaurant = {
    id: restaurant.id,
    place_id: restaurant.google_place_id,
    name: restaurant.name,
    address: restaurant.address,
    city: restaurant.city,
    country: restaurant.country,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
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
    date_visited: restaurant.date_visited,
    is_wishlist: restaurant.is_wishlist,
    userId: restaurant.user_id,
    isSharedRestaurant: !!friendProfile,
    sharedBy: friendProfile ? {
      id: friendProfile.id,
      name: friendProfile.name,
      username: friendProfile.username,
      avatar_url: friendProfile.avatar_url
    } : undefined
  };

  return (
    <UnifiedRestaurantDetails
      restaurant={unifiedRestaurant}
      isLoading={isLoading}
      onBack={handleBack}
      canAddToWishlist={true}
    />
  );
}
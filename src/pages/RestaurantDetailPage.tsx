import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
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
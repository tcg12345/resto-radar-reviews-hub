import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';

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

interface Profile {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
}

export default function MobileRestaurantDetailsPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const fromFriendsActivity = searchParams.get('fromFriendsActivity') === 'true';
  const returnUrl = searchParams.get('returnUrl');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurantDetails = async () => {
      if (!restaurantId) return;
      
      setIsLoading(true);
      try {
        // Determine which user_id to use for the query
        const targetUserId = friendId || user?.id;
        if (!targetUserId) {
          toast({
            title: "Error",
            description: "User not authenticated",
            variant: "destructive",
          });
          return;
        }

        // Fetch restaurant details
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantId)
          .eq('user_id', targetUserId)
          .single();

        if (restaurantError) {
          console.error('Error fetching restaurant:', restaurantError);
          toast({
            title: "Error",
            description: "Failed to load restaurant details",
            variant: "destructive",
          });
          return;
        }

        setRestaurant(restaurantData);

        // Fetch friend profile if viewing a friend's restaurant
        if (friendId && friendId !== user?.id) {
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
        toast({
          title: "Error",
          description: "Failed to load restaurant details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRestaurantDetails();
  }, [restaurantId, friendId, user?.id, toast]);

  const handleBack = () => {
    if (returnUrl) {
      navigate(decodeURIComponent(returnUrl));
    } else if (friendId) {
      navigate(`/mobile/friends/${friendId}`);
    } else if (fromFriendsActivity) {
      navigate('/mobile/search/friends');
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
        isMobile={true}
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
      isMobile={true}
    />
  );
}
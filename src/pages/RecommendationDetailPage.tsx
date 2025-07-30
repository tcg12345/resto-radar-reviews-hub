import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';

interface RecommendationRestaurant {
  name: string;
  cuisine: string;
  address: string;
  distance?: number;
  rating?: number;
  priceRange?: number;
  openingHours?: string;
  isOpen?: boolean;
  photos?: string[];
  place_id?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  website?: string;
  phone?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
}

export function RecommendationDetailPage() {
  const { place_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<RecommendationRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get restaurant data from location state if available
  const restaurantFromState = location.state?.restaurant as RecommendationRestaurant;

  useEffect(() => {
    if (restaurantFromState) {
      setRestaurant(restaurantFromState);
      setIsLoading(false);
    } else if (place_id) {
      // If no state data, you could fetch from Google Places API here
      // For now, we'll show an error since we don't have the data
      toast.error('Restaurant details not found');
      navigate(-1);
    }
  }, [place_id, restaurantFromState, navigate]);

  if (!restaurant) {
    return (
      <UnifiedRestaurantDetails
        restaurant={{} as any}
        isLoading={true}
      />
    );
  }

  // Transform recommendation restaurant data to unified format
  const unifiedRestaurant = {
    place_id: restaurant.place_id,
    name: restaurant.name,
    address: restaurant.address,
    city: restaurant.city,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating,
    priceRange: restaurant.priceRange,
    photos: restaurant.photos,
    website: restaurant.website,
    phone: restaurant.phone,
    formatted_phone_number: restaurant.formatted_phone_number,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    opening_hours: restaurant.opening_hours,
    isOpen: restaurant.isOpen,
    openingHours: restaurant.openingHours,
  };

  return (
    <UnifiedRestaurantDetails
      restaurant={unifiedRestaurant}
      isLoading={isLoading}
      canAddToWishlist={true}
    />
  );
}
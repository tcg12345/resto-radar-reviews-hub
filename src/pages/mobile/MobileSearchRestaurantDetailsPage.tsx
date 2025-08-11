import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Globe, Clock, Heart, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { MichelinStars } from '@/components/MichelinStars';
import { CommunityRating } from '@/components/CommunityRating';
import { CommunityPhotoGallery } from '@/components/CommunityPhotoGallery';
import { FriendPhotoGallery } from '@/components/FriendPhotoGallery';
import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';
import { UnifiedRestaurantDetails } from '@/components/UnifiedRestaurantDetails';
interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
    menu_url?: string;
  };
  aiAnalysis?: {
    cuisine: string;
    categories: string[];
    priceRange?: string;
    michelinStars?: number;
  };
  michelinStars?: number;
  fallbackCuisine?: string;
}
export default function MobileSearchRestaurantDetailsPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [searchParams] = useSearchParams();
  const placeData = searchParams.get('data');
  const [restaurant, setRestaurant] = useState<GooglePlaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);

  // Use restaurant place_id for community reviews
  const {
    communityStats,
    isLoading: isLoadingReviews
  } = useRestaurantReviews(restaurant?.place_id || null, restaurant?.name || null);

  // Debug logging for place_id
  console.log('MobileSearchRestaurantDetailsPage - restaurant?.place_id:', restaurant?.place_id);
  console.log('MobileSearchRestaurantDetailsPage - restaurant?.name:', restaurant?.name);
  const handleBack = () => {
    // Check if we have history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to search page if no history
      navigate('/search');
    }
  };
  useEffect(() => {
    if (placeData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(placeData));
        setRestaurant(parsedData);

        // Load additional details if we have a place_id
        if (parsedData.place_id) {
          loadPlaceDetails(parsedData.place_id, parsedData);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error parsing place data:', error);
        toast.error('Invalid restaurant data');
        handleBack();
      }
    } else {
      toast.error('No restaurant data provided');
      handleBack();
    }
  }, [placeData, navigate]);
  const loadPlaceDetails = async (placeId: string, basicData: GooglePlaceResult) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: placeId,
          type: 'details'
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        const detailedPlace = {
          ...basicData,
          ...data.result
        };
        setRestaurant(detailedPlace);

        // Attempt to link historical friend/expert ratings to this Google Place ID
        // This helps counts show up when older entries lack google_place_id
        try {
          await supabase.rpc('link_restaurant_by_place_id', {
            place_id_param: detailedPlace.place_id,
            restaurant_name_param: detailedPlace.name,
          });
        } catch (e) {
          console.warn('link_restaurant_by_place_id failed (non-blocking):', e);
        }

        // Load Yelp data in background
        supabase.functions.invoke('yelp-restaurant-data', {
          body: {
            action: 'search',
            term: detailedPlace.name,
            location: detailedPlace.formatted_address,
            limit: 1,
            sort_by: 'best_match'
          }
        }).then(({ 
          data: yelpData,
          error: yelpError
        }) => {
          if (!yelpError && yelpData?.businesses?.length > 0) {
            const yelpBusiness = yelpData.businesses[0];
            setRestaurant(prev => prev ? {
              ...prev,
              yelpData: {
                id: yelpBusiness.id,
                url: yelpBusiness.url,
                categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
                price: yelpBusiness.price || undefined,
                photos: yelpBusiness.photos || [],
                transactions: yelpBusiness.transactions || [],
                menu_url: yelpBusiness.menu_url || undefined
              }
            } : null);
          }
        });

        // Enhance with AI after basic data is loaded
        enhanceWithAI(detailedPlace);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const shouldEnhanceWithAI = (restaurant: GooglePlaceResult): boolean => {
    const hasGenericCuisine = !restaurant.aiAnalysis?.cuisine && (!restaurant.fallbackCuisine || restaurant.fallbackCuisine.toLowerCase().includes('restaurant') || restaurant.fallbackCuisine.toLowerCase().includes('bar') || restaurant.fallbackCuisine.toLowerCase().includes('food') || restaurant.fallbackCuisine.toLowerCase().includes('establishment'));
    const hasMissingMichelinInfo = restaurant.michelinStars === undefined;
    return hasGenericCuisine || hasMissingMichelinInfo;
  };
  const enhanceWithAI = async (restaurant: GooglePlaceResult) => {
    if (!shouldEnhanceWithAI(restaurant)) return;
    try {
      setIsEnhancingWithAI(true);

      console.log('Starting AI enhancement for restaurant:', restaurant.name);

      // Run both AI functions in parallel for speed
      const promises = [];

      // Enhance cuisine if needed - with proper parameter names
      const hasGenericCuisine = !restaurant.aiAnalysis?.cuisine && (!restaurant.fallbackCuisine || restaurant.fallbackCuisine.toLowerCase().includes('restaurant') || restaurant.fallbackCuisine.toLowerCase().includes('bar') || restaurant.fallbackCuisine.toLowerCase().includes('food') || restaurant.fallbackCuisine.toLowerCase().includes('establishment'));
      if (hasGenericCuisine) {
        promises.push(supabase.functions.invoke('ai-cuisine-detector', {
          body: {
            restaurantName: restaurant.name,
            address: restaurant.formatted_address,
            types: restaurant.types || []
          }
        }));
      } else {
        promises.push(Promise.resolve({
          data: {
            cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine
          }
        }));
      }

      // Detect Michelin stars if missing
      const hasMissingMichelinInfo = restaurant.michelinStars === undefined;
      if (hasMissingMichelinInfo) {
        promises.push(supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: restaurant.name,
            address: restaurant.formatted_address,
            city: restaurant.formatted_address.split(',')[1]?.trim() || '',
            country: restaurant.formatted_address.split(',').pop()?.trim() || '',
            cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || '',
            notes: ''
          }
        }));
      } else {
        promises.push(Promise.resolve({
          data: {
            stars: restaurant.michelinStars
          }
        }));
      }

      // Wait for both to complete
      const [cuisineResult, michelinResult] = await Promise.all(promises);

      console.log('AI Results received:', {
        cuisine: cuisineResult?.data?.cuisine,
        michelinStars: michelinResult?.data?.stars,
        restaurantName: restaurant.name
      });

      // Set intelligent price range if missing
      let priceRange = restaurant.price_level;
      if (!priceRange) {
        const name = restaurant.name?.toLowerCase() || '';
        const address = restaurant.formatted_address?.toLowerCase() || '';
        const enhancedCuisine = cuisineResult?.data?.cuisine?.toLowerCase() || '';
        
        // Smart price range detection
        if (name.includes('michelin') || address.includes('mayfair') || address.includes('knightsbridge') || 
            enhancedCuisine.includes('french') || enhancedCuisine.includes('fine dining') || 
            michelinResult?.data?.stars > 0) {
          priceRange = 4; // High-end
        } else if ((enhancedCuisine.includes('indian') || enhancedCuisine.includes('japanese')) && 
                   (address.includes('london') || address.includes('central'))) {
          priceRange = 3; // Mid-high for quality restaurants in central areas
        } else if (enhancedCuisine.includes('chinese') || enhancedCuisine.includes('thai') || 
                   enhancedCuisine.includes('vietnamese')) {
          priceRange = 2; // Mid-range for Asian cuisines
        } else {
          priceRange = 3; // Default to mid-high
        }
      }

      // Update restaurant data with AI enhancements
      setRestaurant(prev => prev ? {
        ...prev,
        aiAnalysis: {
          cuisine: cuisineResult?.data?.cuisine || prev.aiAnalysis?.cuisine || prev.fallbackCuisine || 'International',
          categories: prev.aiAnalysis?.categories || [],
          priceRange: priceRange ? '$'.repeat(priceRange) : undefined
        },
        michelinStars: michelinResult?.data?.stars !== undefined ? michelinResult.data.stars : prev.michelinStars || 0,
        price_level: priceRange || prev.price_level
      } : null);

      console.log('AI Enhancement completed successfully for:', restaurant.name);
    } catch (error) {
      console.error('Error enhancing restaurant with AI:', error);
      // Silently fail - don't show error to user for this enhancement
    } finally {
      setIsEnhancingWithAI(false);
    }
  };
  const handleAddToWishlist = async () => {
    if (!user || !restaurant) {
      toast.error('Please log in to add restaurants');
      return;
    }
    setIsAddingToWishlist(true);
    try {
      const {
        error
      } = await supabase.from('restaurants').insert({
        name: restaurant.name,
        address: restaurant.formatted_address,
        city: restaurant.formatted_address.split(',')[1]?.trim() || '',
        cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || 'Various',
        latitude: restaurant.geometry?.location?.lat || null,
        longitude: restaurant.geometry?.location?.lng || null,
        google_place_id: restaurant.place_id,
        // Include place_id for community linking
        rating: null,
        is_wishlist: true,
        user_id: user.id,
        website: restaurant.website,
        opening_hours: restaurant.opening_hours?.weekday_text?.join('\n'),
        price_range: restaurant.price_level,
        phone_number: restaurant.formatted_phone_number
      });
      if (error) throw error;
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };
  const handleAddRating = async () => {
    if (!user || !restaurant) {
      toast.error('Please log in to rate restaurants');
      return;
    }
    try {
      const {
        error
      } = await supabase.from('restaurants').insert({
        name: restaurant.name,
        address: restaurant.formatted_address,
        city: restaurant.formatted_address.split(',')[1]?.trim() || '',
        cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || 'Various',
        latitude: restaurant.geometry?.location?.lat || null,
        longitude: restaurant.geometry?.location?.lng || null,
        google_place_id: restaurant.place_id,
        // Include place_id for community linking
        rating: null,
        is_wishlist: false,
        user_id: user.id,
        website: restaurant.website,
        opening_hours: restaurant.opening_hours?.weekday_text?.join('\n'),
        price_range: restaurant.price_level,
        phone_number: restaurant.formatted_phone_number
      });
      if (error) throw error;
      toast.success('Restaurant added! You can now rate it from your places.');
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };
  const getPhotoUrl = (photoReference: string) => {
    // Use direct URL without environment variable since Lovable doesn't support VITE_ vars
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=AIzaSyDGyJd_l_BZAnseiAx5a5n4a1nSBqnS4dA`;
  };
  if (isLoading || !restaurant) {
    return (
      <UnifiedRestaurantDetails
        restaurant={{ name: '', address: '', cuisine: 'Restaurant' } as any}
        isLoading={true}
        onBack={handleBack}
        isMobile={true}
      />
    );
  }

  // Map Google result to unified data structure used across the app
  const unifiedRestaurant = {
    place_id: restaurant.place_id,
    name: restaurant.name,
    address: restaurant.formatted_address,
    cuisine:
      restaurant.aiAnalysis?.cuisine ||
      restaurant.fallbackCuisine ||
      (restaurant.types?.find((t) => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(t))?.replace(/_/g, ' ')) ||
      'Restaurant',
    price_range: restaurant.price_level,
    rating: restaurant.rating,
    website: restaurant.website,
    phone_number: restaurant.formatted_phone_number,
    opening_hours: restaurant.opening_hours?.weekday_text?.join('\n'),
    latitude: restaurant.geometry?.location?.lat,
    longitude: restaurant.geometry?.location?.lng,
    photos: restaurant.photos?.map((p: any) => p.photo_reference) || [],
  } as any;

  return (
    <UnifiedRestaurantDetails
      restaurant={unifiedRestaurant}
      isLoading={false}
      onBack={handleBack}
      canAddToWishlist={true}
      isMobile={true}
    />
  );
}

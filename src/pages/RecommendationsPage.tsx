import { useState, useEffect } from 'react';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { RecommendationCard } from '@/components/RecommendationCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecommendationsPageProps {
  restaurants: Restaurant[];
  onAddRestaurant: (data: RestaurantFormData) => void;
}

interface RecommendationData {
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
}

export function RecommendationsPage({ restaurants, onAddRestaurant }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating);

  useEffect(() => {
    if (ratedRestaurants.length > 0) {
      fetchRecommendations();
    }
  }, [ratedRestaurants.length]);

  const fetchRecommendations = async () => {
    if (ratedRestaurants.length === 0) return;

    setIsLoading(true);
    try {
      console.log('Rated restaurants:', ratedRestaurants);
      
      // Calculate average location from rated restaurants that have coordinates
      const restaurantsWithCoords = ratedRestaurants.filter(r => r.latitude && r.longitude);
      console.log('Restaurants with coordinates:', restaurantsWithCoords);
      
      let avgLat, avgLng;
      let searchLocation = '';
      
      if (restaurantsWithCoords.length > 0) {
        avgLat = restaurantsWithCoords.reduce((sum, r) => sum + r.latitude!, 0) / restaurantsWithCoords.length;
        avgLng = restaurantsWithCoords.reduce((sum, r) => sum + r.longitude!, 0) / restaurantsWithCoords.length;
        searchLocation = `${avgLat},${avgLng}`;
        console.log('Using average coordinates:', { avgLat, avgLng });
      } else {
        // Fallback: use the most common city from rated restaurants
        const cities = ratedRestaurants.map(r => r.city).filter(Boolean);
        const cityCount = cities.reduce((acc, city) => {
          acc[city] = (acc[city] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const mostCommonCity = Object.keys(cityCount).reduce((a, b) => 
          cityCount[a] > cityCount[b] ? a : b, cities[0] || 'New York'
        );
        
        searchLocation = mostCommonCity;
        console.log('Using city fallback:', mostCommonCity);
      }

      const userPriceRanges = ratedRestaurants
        .filter(r => r.priceRange)
        .map(r => r.priceRange!);
      
      const avgPriceRange = userPriceRanges.length > 0 
        ? Math.round(userPriceRanges.reduce((sum, p) => sum + p, 0) / userPriceRanges.length)
        : 2;

      const userCuisines = [...new Set(ratedRestaurants.map(r => r.cuisine).filter(Boolean))];
      console.log('User preferences:', { avgPriceRange, userCuisines, searchLocation });

      // Search for restaurants near the user's typical dining locations
      const requestBody = restaurantsWithCoords.length > 0 ? {
        location: searchLocation,
        radius: 10000, // 10km radius
        type: 'restaurant',
        keyword: userCuisines.length > 0 ? userCuisines.join(' OR ') : 'restaurant'
      } : {
        query: userCuisines.length > 0 ? userCuisines[0] : 'restaurant',
        location: searchLocation,
        radius: 10000,
        limit: 20
      };

      console.log('Making request to restaurant-search:', requestBody);

      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: requestBody
      });

      console.log('Restaurant search response:', { data, error });

      if (error) throw error;

      if (data?.results) {
        // Filter and process results
        const processedRecommendations = data.results
          .filter((place: any) => {
            // Filter by price range (±1 level from user's average)
            const placePriceLevel = place.priceRange || place.price_level || 2;
            return Math.abs(placePriceLevel - avgPriceRange) <= 1;
          })
          .slice(0, 20) // Limit to top 20
          .map((place: any) => ({
            name: place.name,
            cuisine: place.cuisine || 'Restaurant',
            address: place.address || place.formatted_address || place.vicinity || '',
            rating: place.rating,
            priceRange: place.priceRange || place.price_level,
            distance: place.distance,
            openingHours: place.currentDayHours || (place.isOpen ? 'Open now' : 'Closed'),
            isOpen: place.isOpen,
            photos: place.photos || [],
            place_id: place.id || place.place_id,
            latitude: place.location?.lat || place.geometry?.location?.lat,
            longitude: place.location?.lng || place.geometry?.location?.lng
          }));

        console.log('Processed recommendations:', processedRecommendations);
        setRecommendations(processedRecommendations);
      } else {
        console.log('No results in response');
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRating = (recommendation: RecommendationData) => {
    const restaurantData: RestaurantFormData = {
      name: recommendation.name,
      address: recommendation.address,
      city: '', // Will be parsed from address
      country: '',
      cuisine: recommendation.cuisine,
      priceRange: recommendation.priceRange,
      rating: 0, // User will set this
      notes: '',
      photos: [], // Empty array for new restaurants
      isWishlist: false
    };

    onAddRestaurant(restaurantData);
    toast({
      title: "Restaurant Added",
      description: `${recommendation.name} has been added to your ratings.`,
    });
  };

  const handleAddToWishlist = (recommendation: RecommendationData) => {
    const restaurantData: RestaurantFormData = {
      name: recommendation.name,
      address: recommendation.address,
      city: '',
      country: '',
      cuisine: recommendation.cuisine,
      priceRange: recommendation.priceRange,
      notes: '',
      photos: [], // Empty array for new restaurants
      isWishlist: true
    };

    onAddRestaurant(restaurantData);
    toast({
      title: "Added to Wishlist",
      description: `${recommendation.name} has been added to your wishlist.`,
    });
  };

  if (ratedRestaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Recommendations Yet</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Start rating some restaurants to get personalized recommendations based on your preferences and locations.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recommended For You</h2>
          <p className="text-muted-foreground text-sm">
            Based on {ratedRestaurants.length} restaurants you've rated
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={index}
                restaurant={recommendation}
                onAdd={() => handleAddRating(recommendation)}
                onAddToWishlist={() => handleAddToWishlist(recommendation)}
              />
            ))}
          </div>
        )}

        {!isLoading && recommendations.length === 0 && ratedRestaurants.length > 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              We couldn't find restaurants matching your preferences right now. Try adding more rated restaurants or check back later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [userCities, setUserCities] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const observerTarget = useRef<HTMLDivElement>(null);

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating);

  useEffect(() => {
    if (ratedRestaurants.length > 0) {
      // Get unique cities from rated restaurants
      const cities = [...new Set(ratedRestaurants.map(r => r.city).filter(Boolean))];
      setUserCities(cities);
      setCurrentCityIndex(0);
      setRecommendations([]);
      setHasMore(true);
      fetchRecommendations(cities, 0, true);
    }
  }, [ratedRestaurants.length]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMoreRecommendations();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, userCities, currentCityIndex]);

  const loadMoreRecommendations = useCallback(async () => {
    if (!hasMore || isLoadingMore || userCities.length === 0) return;
    
    setIsLoadingMore(true);
    try {
      const nextCityIndex = (currentCityIndex + 1) % userCities.length;
      await fetchRecommendations(userCities, nextCityIndex, false);
      setCurrentCityIndex(nextCityIndex);
    } catch (error) {
      console.error('Error loading more recommendations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentCityIndex, userCities, hasMore, isLoadingMore]);

  const fetchRecommendations = async (cities: string[], cityIndex: number, isInitial: boolean = false) => {
    if (cities.length === 0) return;
    if (isInitial) {
      setIsLoading(true);
    }

    try {
      const currentCity = cities[cityIndex];
      console.log(`Fetching recommendations for city: ${currentCity} (${cityIndex + 1}/${cities.length})`);
      
      // Get restaurants from this specific city to understand local preferences
      const cityRestaurants = ratedRestaurants.filter(r => r.city === currentCity);
      const userPriceRanges = cityRestaurants
        .filter(r => r.priceRange)
        .map(r => r.priceRange!);
      
      const avgPriceRange = userPriceRanges.length > 0 
        ? Math.round(userPriceRanges.reduce((sum, p) => sum + p, 0) / userPriceRanges.length)
        : 2;

      const cityUserCuisines = [...new Set(cityRestaurants.map(r => r.cuisine).filter(Boolean))];
      console.log(`${currentCity} preferences:`, { avgPriceRange, cityUserCuisines });

      // Search for restaurants in this specific city
      const requestBody = {
        query: `${cityUserCuisines.length > 0 ? cityUserCuisines[0] + ' ' : ''}restaurant`,
        location: currentCity,
        radius: 25000, // 25km radius
        limit: 15 // Get 15 restaurants per city
      };

      console.log('Making request to restaurant-search:', requestBody);

      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: requestBody
      });

      console.log('Restaurant search response:', { data, error });

      if (error) {
        console.error('API Error:', error);
        return;
      }

      if (data?.results && data.results.length > 0) {
        console.log(`Got ${data.results.length} raw results from API for ${currentCity}`);
        
        // Filter and process results
        const filteredResults = data.results.filter((place: any) => {
          const placePriceLevel = place.priceRange || place.price_level || 2;
          const priceMatch = Math.abs(placePriceLevel - avgPriceRange) <= 1;
          
          // Also filter out restaurants the user has already rated
          const alreadyRated = ratedRestaurants.some(rated => 
            rated.name.toLowerCase().includes(place.name.toLowerCase()) ||
            place.name.toLowerCase().includes(rated.name.toLowerCase())
          );
          
          return priceMatch && !alreadyRated;
        });
        
        console.log(`${filteredResults.length} results after filtering for ${currentCity}`);
        
        const processedRecommendations = filteredResults
          .slice(0, 12) // Take 12 per city for variety
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

        console.log(`Processed ${processedRecommendations.length} recommendations for ${currentCity}`);
        
        if (isInitial) {
          setRecommendations(processedRecommendations);
        } else {
          setRecommendations(prev => [...prev, ...processedRecommendations]);
        }
      } else {
        console.log(`No results for ${currentCity}`);
        if (isInitial) {
          setRecommendations([]);
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      if (isInitial) {
        toast({
          title: "Error",
          description: "Failed to load recommendations. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
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
            Based on {ratedRestaurants.length} restaurants you've rated across {userCities.length} cities
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map((recommendation, index) => (
                <RecommendationCard
                  key={`${recommendation.place_id}-${index}`}
                  restaurant={recommendation}
                  onAdd={() => handleAddRating(recommendation)}
                  onAddToWishlist={() => handleAddToWishlist(recommendation)}
                />
              ))}
            </div>
            
            {/* Infinite scroll loader */}
            <div ref={observerTarget} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading more recommendations...</span>
                </div>
              )}
            </div>
          </>
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
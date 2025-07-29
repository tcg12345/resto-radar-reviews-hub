import { useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { RecommendationCard } from '@/components/RecommendationCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RecommendationsMap } from '@/components/RecommendationsMap';
import { MobileRecommendationsMap } from '@/components/mobile/MobileRecommendationsMap';
import { Button } from '@/components/ui/button';

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
  const [allRecommendations, setAllRecommendations] = useState<RecommendationData[]>([]);
  const [displayedCount, setDisplayedCount] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [userCities, setUserCities] = useState<string[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { toast } = useToast();
  const observerTarget = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist && r.rating);

  useEffect(() => {
    if (ratedRestaurants.length > 0) {
      // Get unique cities from rated restaurants
      const cities = [...new Set(ratedRestaurants.map(r => r.city).filter(Boolean))];
      setUserCities(cities);
      setAllRecommendations([]);
      setDisplayedCount(12);
      preloadAllRecommendations(cities);
    }
  }, [ratedRestaurants.length]);

  // Update displayed recommendations when displayedCount changes
  useEffect(() => {
    setRecommendations(allRecommendations.slice(0, displayedCount));
  }, [allRecommendations, displayedCount]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedCount < allRecommendations.length && !isLoading) {
          setDisplayedCount(prev => Math.min(prev + 12, allRecommendations.length));
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedCount, allRecommendations.length, isLoading]);

  const getCacheKey = (cities: string[]) => {
    return `recommendations_${cities.sort().join('_')}_${ratedRestaurants.length}`;
  };

  const getCachedRecommendations = (cities: string[]): RecommendationData[] | null => {
    try {
      const cacheKey = getCacheKey(cities);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;
        // Cache valid for 6 hours
        if (cacheAge < 6 * 60 * 60 * 1000) {
          console.log(`Serving cached recommendations (${data.recommendations.length} items)`);
          return data.recommendations;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  };

  const setCachedRecommendations = (cities: string[], recommendations: RecommendationData[]) => {
    try {
      const cacheKey = getCacheKey(cities);
      const data = {
        recommendations,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`Cached ${recommendations.length} recommendations`);
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  };

  const preloadAllRecommendations = async (cities: string[]) => {
    // First, try to load from cache instantly
    const cached = getCachedRecommendations(cities);
    if (cached && cached.length > 0) {
      setAllRecommendations(cached);
      setIsLoading(false);
      setIsPreloading(false);
      
      // Refresh cache in background (no loading state)
      refreshRecommendationsInBackground(cities);
      return;
    }

    // If no cache, show loading and fetch
    setIsLoading(true);
    setIsPreloading(true);
    
    try {
      console.log(`Loading recommendations for ${cities.length} cities:`, cities);
      const recommendations = await fetchRecommendations(cities);
      setAllRecommendations(recommendations);
      setCachedRecommendations(cities, recommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsPreloading(false);
    }
  };

  const refreshRecommendationsInBackground = async (cities: string[]) => {
    try {
      console.log(`Refreshing recommendations in background for ${cities.length} cities`);
      const recommendations = await fetchRecommendations(cities);
      setAllRecommendations(recommendations);
      setCachedRecommendations(cities, recommendations);
      console.log('Background refresh completed');
    } catch (error) {
      console.error('Background refresh failed:', error);
    }
  };

  const fetchRecommendations = async (cities: string[]): Promise<RecommendationData[]> => {
    // Calculate overall user preferences
    const userPriceRanges = ratedRestaurants
      .filter(r => r.priceRange)
      .map(r => r.priceRange!);
    
    const globalAvgPriceRange = userPriceRanges.length > 0 
      ? Math.round(userPriceRanges.reduce((sum, p) => sum + p, 0) / userPriceRanges.length)
      : 2;

    // Create parallel requests for all cities
    const cityPromises = cities.map(async (city, index) => {
      try {
        console.log(`Fetching recommendations for ${city} (${index + 1}/${cities.length})`);
        
        // Get city-specific preferences
        const cityRestaurants = ratedRestaurants.filter(r => r.city === city);
        const cityUserCuisines = [...new Set(cityRestaurants.map(r => r.cuisine).filter(Boolean))];
        
        const requestBody = {
          query: `${cityUserCuisines.length > 0 ? cityUserCuisines[0] + ' ' : ''}restaurant`,
          location: city,
          radius: 25000,
          limit: 20
        };

        const { data, error } = await supabase.functions.invoke('restaurant-search', {
          body: requestBody
        });

        if (error) {
          console.error(`Error fetching ${city}:`, error);
          return [];
        }

        if (data?.results && data.results.length > 0) {
          // Filter and process results
          const filteredResults = data.results.filter((place: any) => {
            const placePriceLevel = place.priceRange || place.price_level || 2;
            const priceMatch = Math.abs(placePriceLevel - globalAvgPriceRange) <= 1;
            
            // Filter out restaurants the user has already rated
            const alreadyRated = ratedRestaurants.some(rated => 
              rated.name.toLowerCase().includes(place.name.toLowerCase()) ||
              place.name.toLowerCase().includes(rated.name.toLowerCase())
            );
            
            return priceMatch && !alreadyRated;
          });
          
          const processedRecommendations = filteredResults
            .slice(0, 15)
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
              longitude: place.location?.lng || place.geometry?.location?.lng,
              city: city
            }));

          console.log(`Processed ${processedRecommendations.length} recommendations for ${city}`);
          return processedRecommendations;
        }
        
        return [];
      } catch (error) {
        console.error(`Error processing ${city}:`, error);
        return [];
      }
    });

    // Wait for all cities to complete in parallel
    const allCityResults = await Promise.all(cityPromises);
    
    // Flatten and shuffle for variety
    const allRecs = allCityResults.flat();
    
    // Shuffle to mix cities together
    const shuffledRecs = allRecs.sort(() => Math.random() - 0.5);
    
    console.log(`Loaded ${shuffledRecs.length} total recommendations from ${cities.length} cities`);
    return shuffledRecs;
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

  if (showMap) {
    return isMobile ? (
      <MobileRecommendationsMap
        userRatedRestaurants={ratedRestaurants}
        onClose={() => setShowMap(false)}
        onAddRestaurant={onAddRestaurant}
      />
    ) : (
      <RecommendationsMap
        userRatedRestaurants={ratedRestaurants}
        onClose={() => setShowMap(false)}
        onAddRestaurant={onAddRestaurant}
      />
    );
  }

  return (
    <div className="w-full h-full relative">
      {/* Map Button - Fixed in bottom right, above nav bar */}
      <Button
        onClick={() => setShowMap(true)}
        className="fixed bottom-8 right-6 z-40 shadow-lg px-3 py-2 md:px-4 md:py-2"
        size="sm"
      >
        <Map className="h-4 w-4 mr-1 md:mr-2" />
        <span className="text-sm font-medium">Map</span>
      </Button>

      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recommended For You</h2>
          <p className="text-muted-foreground text-sm">
            {isPreloading 
              ? `Loading recommendations from ${userCities.length} cities...`
              : `Showing ${recommendations.length} of ${allRecommendations.length} restaurants from ${userCities.length} cities`
            }
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-sm">Pre-loading recommendations from all your cities...</p>
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
            
            {/* Infinite scroll target */}
            <div ref={observerTarget} className="flex justify-center py-8">
              {displayedCount < allRecommendations.length && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Loading more...</span>
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
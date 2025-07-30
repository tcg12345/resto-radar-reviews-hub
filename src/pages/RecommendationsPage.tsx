import { useState, useEffect, useRef } from 'react';
import { Restaurant, RestaurantFormData } from '@/types/restaurant';
import { RecommendationCard } from '@/components/RecommendationCard';
import { RecommendationFilters } from '@/components/RecommendationFilters';
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
  city?: string;
}

export function RecommendationsPage({ restaurants, onAddRestaurant }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<RecommendationData[]>([]);
  const [displayedCount, setDisplayedCount] = useState(20);
  const [allLoadedRecommendations, setAllLoadedRecommendations] = useState<RecommendationData[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [userCities, setUserCities] = useState<string[]>([]);
  const [currentCityIndex, setCurrentCityIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  
  // Filter states
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<RecommendationData[]>([]);
  
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

  // Apply filters to recommendations
  useEffect(() => {
    let filtered = allLoadedRecommendations;
    
    // Filter by selected cities
    if (selectedCities.length > 0) {
      filtered = filtered.filter(rec => 
        rec.city && selectedCities.includes(rec.city)
      );
    }
    
    // Filter by selected price ranges
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter(rec => 
        rec.priceRange && selectedPriceRanges.includes(rec.priceRange)
      );
    }
    
    setFilteredRecommendations(filtered);
  }, [allLoadedRecommendations, selectedCities, selectedPriceRanges]);

  // Update displayed recommendations when displayedCount or filters change
  useEffect(() => {
    setRecommendations(filteredRecommendations.slice(0, displayedCount));
  }, [filteredRecommendations, displayedCount]);

  // Load initial recommendations instantly
  useEffect(() => {
    if (ratedRestaurants.length > 0 && !hasLoadedInitial) {
      const cities = [...new Set(ratedRestaurants.map(r => r.city).filter(Boolean))];
      setUserCities(cities);
      setCurrentCityIndex(0);
      
      // Load cached data first, then fetch new data
      loadInitialRecommendations(cities);
      setHasLoadedInitial(true);
    }
  }, [ratedRestaurants.length, hasLoadedInitial]);

  // Infinite scroll observer - now just shows more from preloaded data
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        console.log('Intersection observer triggered:', entries[0].isIntersecting, 'isLoadingMore:', isLoadingMore, 'displayedCount:', displayedCount, 'total:', filteredRecommendations.length);
        if (entries[0].isIntersecting && !isLoadingMore && displayedCount < filteredRecommendations.length) {
          console.log('Calling handleInfiniteScroll');
          handleInfiniteScroll();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
      console.log('Observer attached to target');
    }

    return () => observer.disconnect();
  }, [displayedCount, filteredRecommendations.length, isLoadingMore]);

  // Preload more data when we're running low - much more aggressive
  useEffect(() => {
    const remainingItems = filteredRecommendations.length - displayedCount;
    if (remainingItems < 100 && !isLoadingMore && userCities.length > 0) {
      // Load multiple batches in parallel for faster preloading
      loadMultipleBatchesInBackground();
    }
  }, [displayedCount, filteredRecommendations.length, isLoadingMore, userCities.length]);

  const loadMultipleBatchesInBackground = async () => {
    if (isLoadingMore || userCities.length === 0) return;
    
    setIsLoadingMore(true);
    
    try {
      // Load from 3 cities in parallel
      const citiesToLoad = [];
      for (let i = 0; i < 3; i++) {
        const cityIndex = (currentCityIndex + i) % userCities.length;
        citiesToLoad.push(userCities[cityIndex]);
      }
      
      const promises = citiesToLoad.map(city => fetchRecommendationsForCity(city));
      const results = await Promise.all(promises);
      const allNewRecs = results.flat();
      
      if (allNewRecs.length > 0) {
        const shuffled = allNewRecs.sort(() => Math.random() - 0.5);
        setAllLoadedRecommendations(prev => {
          const combined = [...prev, ...shuffled];
          const unique = combined.filter((item, index, arr) => 
            arr.findIndex(t => t.place_id === item.place_id) === index
          );
          return unique;
        });
        
        // Cache all the new data
        results.forEach((cityResults, index) => {
          if (cityResults.length > 0) {
            setCachedRecommendations(citiesToLoad[index], cityResults);
          }
        });
      }
      
      // Move forward by 3 cities
      setCurrentCityIndex(prev => prev + 3);
    } catch (error) {
      console.error('Error loading multiple batches:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const getCacheKey = (city: string) => {
    return `recommendations_${city}_v2`;
  };

  const getCachedRecommendations = (city: string): RecommendationData[] => {
    try {
      const cached = localStorage.getItem(getCacheKey(city));
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;
        // Cache valid for 1 hour
        if (cacheAge < 60 * 60 * 1000) {
          return data.recommendations || [];
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return [];
  };

  const setCachedRecommendations = (city: string, recommendations: RecommendationData[]) => {
    try {
      const data = {
        recommendations,
        timestamp: Date.now()
      };
      localStorage.setItem(getCacheKey(city), JSON.stringify(data));
    } catch (error) {
      console.error('Error caching recommendations:', error);
    }
  };

  const handleInfiniteScroll = () => {
    // Instantly show more from already loaded data
    console.log('handleInfiniteScroll called: current displayed:', displayedCount, 'total available:', filteredRecommendations.length);
    const newDisplayedCount = Math.min(displayedCount + 20, filteredRecommendations.length);
    console.log('Setting new displayedCount to:', newDisplayedCount);
    setDisplayedCount(newDisplayedCount);
  };


  const loadInitialRecommendations = async (cities: string[]) => {
    // First, load any cached data instantly
    const cachedData: RecommendationData[] = [];
    cities.forEach(city => {
      const cached = getCachedRecommendations(city);
      cachedData.push(...cached);
    });
    
    if (cachedData.length > 0) {
      // Show cached data instantly
      const shuffled = cachedData.sort(() => Math.random() - 0.5);
      setAllLoadedRecommendations(shuffled);
    }
    
    // Load fresh data from multiple cities in parallel
    const initialBatches = cities.slice(0, 3); // Load from first 3 cities
    const promises = initialBatches.map(city => fetchRecommendationsForCity(city));
    
    try {
      const results = await Promise.all(promises);
      const allNewRecs = results.flat();
      
      if (allNewRecs.length > 0) {
        const shuffled = allNewRecs.sort(() => Math.random() - 0.5);
        setAllLoadedRecommendations(prev => {
          const combined = [...prev, ...shuffled];
          const unique = combined.filter((item, index, arr) => 
            arr.findIndex(t => t.place_id === item.place_id) === index
          );
          return unique;
        });
        
        // Cache all the new data
        results.forEach((cityResults, index) => {
          if (cityResults.length > 0) {
            setCachedRecommendations(initialBatches[index], cityResults);
          }
        });
      }
      
      setCurrentCityIndex(3); // Start next loads from city 3
    } catch (error) {
      console.error('Error loading initial recommendations:', error);
    }
  };

  const fetchRecommendationsForCity = async (city: string): Promise<RecommendationData[]> => {
    // Calculate user preferences
    const userPriceRanges = ratedRestaurants
      .filter(r => r.priceRange)
      .map(r => r.priceRange!);
    
    const avgPriceRange = userPriceRanges.length > 0 
      ? Math.round(userPriceRanges.reduce((sum, p) => sum + p, 0) / userPriceRanges.length)
      : 2;

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
      const filteredResults = data.results.filter((place: any) => {
        const placePriceLevel = place.priceRange || place.price_level || 2;
        const priceMatch = Math.abs(placePriceLevel - avgPriceRange) <= 1;
        
        // Filter out restaurants the user has already rated
        const alreadyRated = ratedRestaurants.some(rated => 
          rated.name.toLowerCase().includes(place.name.toLowerCase()) ||
          place.name.toLowerCase().includes(rated.name.toLowerCase())
        );
        
        return priceMatch && !alreadyRated;
      });
      
      const basicRecommendations = filteredResults.map((place: any) => ({
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
        city: city,
      }));

      // Enhance cuisine information for restaurants that have generic "Restaurant" cuisine
      const enhancedRecommendations = await enhanceCuisineInformation(basicRecommendations);
      return enhancedRecommendations;
    }
    
    return [];
  };

  // Enhanced function to get accurate cuisine information
  const enhanceCuisineInformation = async (recommendations: RecommendationData[]): Promise<RecommendationData[]> => {
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        // Only enhance if cuisine is generic "Restaurant"
        if (rec.cuisine === 'Restaurant') {
          try {
            const { data, error } = await supabase.functions.invoke('ai-cuisine-detector', {
              body: { 
                restaurantName: rec.name,
                address: rec.address,
                types: [] // Add Google Places types if available
              }
            });
            
            if (!error && data?.cuisine && data.cuisine !== 'Restaurant') {
              return { ...rec, cuisine: data.cuisine };
            }
          } catch (error) {
            console.error('Error detecting cuisine for', rec.name, error);
          }
        }
        return rec;
      })
    );
    
    return enhancedRecommendations;
  };

  const handleAddRating = (recommendation: RecommendationData) => {
    const restaurantData: RestaurantFormData = {
      name: recommendation.name,
      address: recommendation.address,
      city: '',
      country: '',
      cuisine: recommendation.cuisine,
      priceRange: recommendation.priceRange,
      rating: 0,
      notes: '',
      photos: [],
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
      photos: [],
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
      <Button
        onClick={() => setShowMap(true)}
        className="fixed bottom-24 right-6 z-40 shadow-lg px-3 py-2 md:px-4 md:py-2"
        size="sm"
      >
        <Map className="h-4 w-4 mr-1 md:mr-2" />
        <span className="text-sm font-medium">Map</span>
      </Button>

      <div className="p-4 lg:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Recommended For You</h2>
          <p className="text-muted-foreground text-sm">
            Showing {recommendations.length} restaurants from {userCities.length} cities
          </p>
        </div>

        {/* Filters */}
        <RecommendationFilters
          availableCities={userCities}
          selectedCities={selectedCities}
          selectedPriceRanges={selectedPriceRanges}
          onCityChange={setSelectedCities}
          onPriceRangeChange={setSelectedPriceRanges}
          isMobile={isMobile}
        />

        <div className="lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0 space-y-0">
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
          {displayedCount < filteredRecommendations.length ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading more recommendations...</span>
            </div>
          ) : isLoadingMore ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Finding new restaurants...</span>
            </div>
          ) : filteredRecommendations.length > 20 ? (
            <div className="text-sm text-muted-foreground">
              You've seen all {filteredRecommendations.length} recommendations
            </div>
          ) : null}
        </div>

        {recommendations.length === 0 && !isLoadingMore && (
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
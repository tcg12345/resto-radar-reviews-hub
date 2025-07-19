import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useDiscover } from '@/contexts/DiscoverContext';
import { DiscoverSearchForm } from '@/components/DiscoverSearchForm';
import { DiscoverResultsGrid } from '@/components/DiscoverResultsGrid';
import { Search, TrendingUp, Award, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RestaurantResult {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  priceRange: number;
  rating: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  website?: string;
  phoneNumber?: string;
  openingHours?: string;
  features: string[];
  michelinStars?: number;
  location?: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  images?: string[];
  isOpen?: boolean;
}

export function DiscoverPage() {
  const {
    searchQuery,
    setSearchQuery,
    locationQuery,
    setLocationQuery,
    restaurants,
    setRestaurants,
    hasSearched,
    setHasSearched,
  } = useDiscover();
  
  const { addRestaurant, restaurants: existingRestaurants, deleteRestaurant } = useRestaurants();
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search required",
        description: "Please describe what type of restaurant you're looking for",
        variant: "destructive",
      });
      return;
    }

    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('restaurant-discovery', {
        body: {
          query: searchQuery,
          location: locationQuery,
          filters: {}
        }
      });

      if (error) {
        throw error;
      }

      setRestaurants(data.restaurants || []);
      
      const resultCount = data.restaurants?.length || 0;
      const michelinCount = data.restaurants?.filter((r: RestaurantResult) => r.michelinStars).length || 0;
      
      toast({
        title: "Search completed!",
        description: `Found ${resultCount} restaurants${michelinCount > 0 ? `, including ${michelinCount} Michelin starred` : ''}`,
      });
    } catch (error) {
      console.error('Search error:', error);
      setRestaurants([]);
      toast({
        title: "Search failed",
        description: "Could not search restaurants. Please try again.",
        variant: "destructive",
      });
    }
  }, [searchQuery, locationQuery, toast, setRestaurants, setHasSearched]);

  const handleToggleWishlist = (restaurant: RestaurantResult) => {
    const existingRestaurant = existingRestaurants.find(r => 
      r.name.toLowerCase() === restaurant.name.toLowerCase() && 
      r.address === restaurant.address
    );

    if (existingRestaurant) {
      deleteRestaurant(existingRestaurant.id);
      toast({
        title: "Removed from wishlist",
        description: `${restaurant.name} has been removed from your wishlist`,
      });
    } else {
      const newRestaurant = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.location?.city || 'Unknown',
        cuisine: restaurant.cuisine,
        priceRange: restaurant.priceRange,
        rating: 0,
        reviewCount: restaurant.reviewCount,
        googleMapsUrl: restaurant.googleMapsUrl,
        notes: '',
        isWishlist: true,
        latitude: restaurant.location?.lat,
        longitude: restaurant.location?.lng,
        website: restaurant.website,
        phoneNumber: restaurant.phoneNumber,
        photos: [] as File[],
      };

      addRestaurant(newRestaurant);
      toast({
        title: "Added to wishlist!",
        description: `${restaurant.name} has been added to your wishlist`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
            Discover Amazing Restaurants
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Use AI to find your perfect dining experience. Just describe what you want in natural language.
          </p>
        </div>

        {/* Quick Stats */}
        {hasSearched && restaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Average Rating</p>
                  <p className="text-2xl font-bold text-green-700">
                    {(restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
              <CardContent className="p-4 flex items-center gap-3">
                <Award className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-sm text-amber-600 font-medium">Michelin Starred</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {restaurants.filter(r => r.michelinStars).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
              <CardContent className="p-4 flex items-center gap-3">
                <MapPin className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Unique Locations</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {new Set(restaurants.map(r => r.location?.city || 'Unknown')).size}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search Form */}
        <DiscoverSearchForm
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          locationQuery={locationQuery}
          setLocationQuery={setLocationQuery}
          onSearch={handleSearch}
          isLoading={false}
        />

        {/* Results */}
        <DiscoverResultsGrid
          restaurants={restaurants}
          onToggleWishlist={handleToggleWishlist}
          existingRestaurants={existingRestaurants}
          searchQuery={searchQuery}
          isLoading={false}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}
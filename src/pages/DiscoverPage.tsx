import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useDiscover } from '@/contexts/DiscoverContext';
import { DiscoverSearchForm, type SearchType } from '@/components/DiscoverSearchForm';
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
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
  };
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
    isLoading,
    setIsLoading,
  } = useDiscover();
  
  const [searchType, setSearchType] = useState<SearchType>('description');
  
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

    setIsLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('restaurant-discovery', {
        body: {
          query: searchQuery,
          location: locationQuery,
          searchType: searchType, // Pass search type to backend
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
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, locationQuery, toast, setRestaurants, setHasSearched, setIsLoading]);

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
    <div className="full-viewport bg-gradient-subtle">
      <div className="page-container gap-section">
        {/* Header */}
        <div className="text-center gap-content">
          <h1 className="text-4xl lg:text-5xl font-bold text-gradient">
            Discover Amazing Restaurants
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Use AI to find your perfect dining experience. Just describe what you want in natural language.
          </p>
        </div>

        {/* Quick Stats */}
        {hasSearched && restaurants.length > 0 && (
          <div className="grid-cards">
            <Card className="glass-card border-success">
              <CardContent className="card-container flex-start gap-content">
                <TrendingUp className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm text-success font-medium">Average Rating</p>
                  <p className="text-2xl font-bold text-success">
                    {(restaurants.reduce((sum, r) => sum + r.rating, 0) / restaurants.length).toFixed(1)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-warning">
              <CardContent className="card-container flex-start gap-content">
                <Award className="h-8 w-8 text-warning" />
                <div>
                  <p className="text-sm text-warning font-medium">Michelin Starred</p>
                  <p className="text-2xl font-bold text-warning">
                    {restaurants.filter(r => r.michelinStars).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary">
              <CardContent className="card-container flex-start gap-content">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-primary font-medium">Unique Locations</p>
                  <p className="text-2xl font-bold text-primary">
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
          searchType={searchType}
          setSearchType={setSearchType}
          onSearch={handleSearch}
          isLoading={isLoading}
        />

        {/* Results */}
        <DiscoverResultsGrid
          restaurants={restaurants}
          onToggleWishlist={handleToggleWishlist}
          existingRestaurants={existingRestaurants}
          searchQuery={searchQuery}
          isLoading={isLoading}
          hasSearched={hasSearched}
        />
      </div>
    </div>
  );
}
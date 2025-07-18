import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Phone, 
  Globe, 
  Calendar,
  Heart,
  ExternalLink,
  Filter,
  Sparkles,
  ChefHat,
  DollarSign,
  Users,
  Car,
  Wifi,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';
import { useRestaurants } from '@/contexts/RestaurantContext';

interface RestaurantResult {
  id: string;
  name: string;
  address: string;
  cuisine: string;
  priceRange: number;
  rating: number;
  description: string;
  website?: string;
  reservationUrl?: string;
  phoneNumber?: string;
  openingHours?: string;
  features: string[];
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
  images?: string[];
  isOpen?: boolean;
  nextAvailableSlot?: string;
}

interface SearchFilters {
  priceRange?: [number, number];
  cuisine?: string;
  features?: string[];
}

export function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [restaurants, setRestaurants] = useState<RestaurantResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { addRestaurant } = useRestaurants();
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search required",
        description: "Please enter what type of restaurant you're looking for",
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
          filters: filters
        }
      });

      if (error) throw error;

      setRestaurants(data.restaurants || []);
      toast({
        title: "Search completed!",
        description: `Found ${data.restaurants?.length || 0} restaurants matching your criteria`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Could not search restaurants. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, locationQuery, filters, toast]);

  const handleAddToWishlist = (restaurant: RestaurantResult) => {
    const newRestaurant = {
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.location.city,
      cuisine: restaurant.cuisine,
      priceRange: restaurant.priceRange,
      rating: 0,
      notes: restaurant.description,
      isWishlist: true,
      latitude: restaurant.location.lat,
      longitude: restaurant.location.lng,
      website: restaurant.website,
      phoneNumber: restaurant.phoneNumber,
      photos: [] as File[], // Add required photos property
    };

    addRestaurant(newRestaurant);
    toast({
      title: "Added to wishlist!",
      description: `${restaurant.name} has been added to your wishlist`,
    });
  };

  const getPriceRangeDisplay = (range: number) => {
    return '$'.repeat(range);
  };

  const getFeatureIcon = (feature: string) => {
    const lowerFeature = feature.toLowerCase();
    if (lowerFeature.includes('outdoor') || lowerFeature.includes('patio')) return Car;
    if (lowerFeature.includes('wifi') || lowerFeature.includes('internet')) return Wifi;
    if (lowerFeature.includes('vegetarian') || lowerFeature.includes('vegan')) return ChefHat;
    if (lowerFeature.includes('family') || lowerFeature.includes('kids')) return Users;
    if (lowerFeature.includes('card') || lowerFeature.includes('payment')) return CreditCard;
    return Sparkles;
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Search className="h-8 w-8 text-primary" />
          Discover Restaurants
        </h1>
        <p className="text-muted-foreground text-lg">
          Find your next perfect dining experience with AI-powered search
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Natural Language Search
          </CardTitle>
          <CardDescription>
            Describe what you're looking for in your own words - cuisine, mood, occasion, dietary needs, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="e.g., 'Romantic Italian restaurant for anniversary' or 'Best tacos near downtown'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="text-base"
              />
            </div>
            <Input
              placeholder="Location (optional)"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSearch} disabled={isLoading} className="flex-1 md:flex-none">
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Discover Restaurants'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Sample queries */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Vegetarian fine dining in Manhattan",
                "Family-friendly pizza place with outdoor seating",
                "Sushi restaurant for business dinner",
                "Romantic French bistro for date night",
                "Brunch spot with bottomless mimosas"
              ].map((example, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery(example)}
                  className="text-xs bg-muted/50 hover:bg-muted"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {hasSearched && !isLoading && restaurants.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No restaurants found matching your search. Try adjusting your query or location.
          </AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {restaurants.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              Found {restaurants.length} restaurants
            </h2>
            <Badge variant="secondary" className="text-sm">
              AI-Generated Results
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="hover:shadow-lg transition-all duration-200 group">
                <CardHeader className="p-0">
                  <div className="relative">
                    <LazyImage
                      src={restaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop'}
                      alt={restaurant.name}
                      className="h-48 w-full object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge 
                        variant={restaurant.isOpen ? "default" : "secondary"}
                        className={restaurant.isOpen ? "bg-green-600" : ""}
                      >
                        {restaurant.isOpen ? "Open Now" : "Closed"}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 bg-white/90 hover:bg-white"
                        onClick={() => handleAddToWishlist(restaurant)}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {restaurant.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {restaurant.cuisine}
                      </Badge>
                      <span className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {getPriceRangeDisplay(restaurant.priceRange)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{restaurant.rating}</span>
                    <span className="text-muted-foreground">•</span>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground truncate">
                      {restaurant.location.city}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {restaurant.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1">
                    {restaurant.features.slice(0, 3).map((feature, index) => {
                      const FeatureIcon = getFeatureIcon(feature);
                      return (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <FeatureIcon className="h-3 w-3 mr-1" />
                          {feature}
                        </Badge>
                      );
                    })}
                    {restaurant.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{restaurant.features.length - 3} more
                      </Badge>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 pt-2 border-t">
                    {restaurant.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{restaurant.phoneNumber}</span>
                      </div>
                    )}
                    
                    {restaurant.openingHours && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{restaurant.openingHours}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {restaurant.website && (
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                            <Globe className="h-4 w-4 mr-1" />
                            Website
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      
                      {restaurant.reservationUrl && (
                        <Button size="sm" className="flex-1" asChild>
                          <a href={restaurant.reservationUrl} target="_blank" rel="noopener noreferrer">
                            <Calendar className="h-4 w-4 mr-1" />
                            Reserve
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
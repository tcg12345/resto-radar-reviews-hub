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
  AlertCircle,
  Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LazyImage } from '@/components/LazyImage';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useDiscover } from '@/contexts/DiscoverContext';

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
  reservationNote?: string;
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
  // Fallback properties in case location object is missing
  city?: string;
  lat?: number;
  lng?: number;
  country?: string;
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
  const [isLoading, setIsLoading] = useState(false);
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

    console.log('Starting search with query:', searchQuery);
    setIsLoading(true);
    setHasSearched(true);

    try {
      console.log('Invoking restaurant-discovery function...');
      const { data, error } = await supabase.functions.invoke('restaurant-discovery', {
        body: {
          query: searchQuery,
          location: locationQuery,
          filters: filters
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Setting restaurants data:', data.restaurants);
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
      console.log('Search completed, setting loading to false');
      setIsLoading(false);
    }
  }, [searchQuery, locationQuery, filters, toast]);

  const { restaurants: existingRestaurants, deleteRestaurant } = useRestaurants();

  const handleToggleWishlist = (restaurant: RestaurantResult) => {
    // Check if restaurant is already in wishlist
    const existingRestaurant = existingRestaurants.find(r => 
      r.name.toLowerCase() === restaurant.name.toLowerCase() && 
      r.address === restaurant.address
    );

    if (existingRestaurant) {
      // Remove from wishlist
      deleteRestaurant(existingRestaurant.id);
      toast({
        title: "Removed from wishlist",
        description: `${restaurant.name} has been removed from your wishlist`,
      });
    } else {
      // Add to wishlist
      const newRestaurant = {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.location?.city || restaurant.city || 'Unknown',
        cuisine: restaurant.cuisine,
        priceRange: restaurant.priceRange,
        rating: 0,
        notes: restaurant.description,
        isWishlist: true,
        latitude: restaurant.location?.lat || restaurant.lat,
        longitude: restaurant.location?.lng || restaurant.lng,
        website: restaurant.website,
        phoneNumber: restaurant.phoneNumber,
        photos: [] as File[], // Add required photos property
      };

      addRestaurant(newRestaurant);
      toast({
        title: "Added to wishlist!",
        description: `${restaurant.name} has been added to your wishlist`,
      });
    }
  };

  console.log('DiscoverPage rendering with:', { 
    searchQuery, 
    locationQuery, 
    restaurants: restaurants.length, 
    isLoading, 
    hasSearched 
  });

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
              <RestaurantImageCard key={restaurant.id} restaurant={restaurant} onToggleWishlist={handleToggleWishlist} existingRestaurants={existingRestaurants} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Restaurant card component with image loading placeholder
function RestaurantImageCard({ restaurant, onToggleWishlist, existingRestaurants }: { 
  restaurant: RestaurantResult; 
  onToggleWishlist: (restaurant: RestaurantResult) => void;
  existingRestaurants: any[];
}) {
  const [imageLoading, setImageLoading] = useState(true);
  
  // Check if restaurant is in wishlist
  const isInWishlist = existingRestaurants.some(r => 
    r.name.toLowerCase() === restaurant.name.toLowerCase() && 
    r.address === restaurant.address
  );
  
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
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="p-0">
         <div className="relative">
           {imageLoading && (
             <div className="absolute inset-0 z-10">
               <div className="h-48 w-full bg-muted animate-pulse rounded-t-lg" />
             </div>
           )}
           <img
             src={restaurant.images?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop'}
             alt={restaurant.name}
             className="h-48 w-full object-cover rounded-t-lg"
             onLoad={() => setImageLoading(false)}
             onError={(e) => {
               console.error('Image load error for restaurant:', restaurant.name);
               e.currentTarget.src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop';
               setImageLoading(false);
             }}
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
              className={`h-8 w-8 transition-colors ${
                isInWishlist 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white/90 hover:bg-white text-gray-700 dark:bg-gray-800/90 dark:hover:bg-gray-800 dark:text-white'
              }`}
              onClick={() => onToggleWishlist(restaurant)}
            >
              <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {restaurant.cuisine}
            </Badge>
            <span className="text-green-600 font-bold text-base">
              {getPriceRangeDisplay(restaurant.priceRange)}
            </span>
            {restaurant.michelinStars && (
              <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-600">
                  {restaurant.michelinStars} Michelin
                </span>
              </div>
            )}
          </div>
        </div>
       </div>

       <div className="flex items-center gap-2">
         <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
         <span className="font-medium">{restaurant.rating}</span>
         <span className="text-muted-foreground">•</span>
         <MapPin className="h-4 w-4 text-muted-foreground" />
         <span className="text-sm text-muted-foreground truncate">
           {restaurant.location?.city || restaurant.city || 'Unknown location'}
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
           
             {restaurant.website ? (
               <Button size="sm" className="flex-1" asChild>
                 <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                   <Calendar className="h-4 w-4 mr-1" />
                   Reserve
                   <ExternalLink className="h-3 w-3 ml-1" />
                 </a>
               </Button>
             ) : (
               <Button size="sm" variant="outline" className="flex-1" disabled>
                 <Calendar className="h-4 w-4 mr-1" />
                 Call to Reserve
               </Button>
             )}
         </div>
       </div>
       </CardContent>
     </Card>
  );
}
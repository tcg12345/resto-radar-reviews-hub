import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Lightbulb, Heart, Clock, Globe, Phone, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { Restaurant } from '@/types/restaurant';
import { RestaurantDetailsModal } from '@/components/RestaurantDetailsModal';
import { RecommendationCardSkeleton } from '@/components/skeletons/RecommendationCardSkeleton';
import { toast } from 'sonner';

interface RecommendationEngine {
  getPersonalizedRecommendations: () => Promise<GooglePlaceResult[]>;
}

interface AIRecommendation extends GooglePlaceResult {
  ai_reasoning?: string;
  confidence_score?: number;
  match_factors?: string[];
  website?: string;
  google_maps_url?: string;
  price_range?: number;
  formatted_phone_number?: string;
}

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
}

export function PersonalizedRecommendations() {
  const { user } = useAuth();
  const { addRestaurant } = useRestaurants();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cuisineCache, setCuisineCache] = useState<Record<string, string>>({});
  const [addingToWishlist, setAddingToWishlist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Don't automatically load recommendations - wait for user to click button
  }, [user]);

  const generateRecommendations = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // Get user's rated restaurants (exclude wishlist items)
      const { data: ratedRestaurants, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_wishlist', false)
        .not('rating', 'is', null);

      if (fetchError) {
        throw new Error(`Database error: ${fetchError.message}`);
      }

      console.log(`Found ${ratedRestaurants?.length || 0} rated restaurants for analysis`);

      if (!ratedRestaurants || ratedRestaurants.length === 0) {
        setError('No rated restaurants found. Start rating some restaurants to get personalized recommendations!');
        setRecommendations([]);
        return;
      }

      // Get user's current location
      const userLocation = await getCurrentLocation();

      // Call AI recommendations function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-personalized-recommendations', {
        body: {
          ratedRestaurants: ratedRestaurants.map(r => ({
            name: r.name,
            cuisine: r.cuisine,
            rating: r.rating,
            price_range: r.price_range,
            notes: r.notes,
            address: r.address,
            city: r.city,
            latitude: r.latitude,
            longitude: r.longitude
          })),
          userLocation
        }
      });

      if (aiError) {
        console.error('AI recommendation error:', aiError);
        throw new Error('Failed to generate AI recommendations');
      }

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      console.log('AI recommendations received:', aiResponse.recommendations?.length || 0);
      
      // Get AI-detected cuisines for the recommendations
      if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
        await detectCuisines(aiResponse.recommendations);
      }
      
      setRecommendations(aiResponse.recommendations || []);
      setPreferences(aiResponse.preferences);

    } catch (error) {
      console.error('Error generating recommendations:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate recommendations');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectCuisines = async (restaurants: AIRecommendation[]) => {
    try {
      // Check cache first
      const uncachedRestaurants = restaurants.filter(r => !cuisineCache[r.place_id]);
      
      if (uncachedRestaurants.length === 0) {
        return; // All cuisines already cached
      }

      const { data: cuisineResponse, error: cuisineError } = await supabase.functions.invoke('ai-cuisine-detector', {
        body: {
          restaurants: uncachedRestaurants.map(r => ({
            place_id: r.place_id,
            name: r.name,
            formatted_address: r.formatted_address,
            types: r.types
          }))
        }
      });

      if (cuisineError) {
        console.error('Cuisine detection error:', cuisineError);
        return;
      }

      if (cuisineResponse?.cuisines) {
        const newCache = { ...cuisineCache };
        cuisineResponse.cuisines.forEach((item: any) => {
          newCache[item.place_id] = item.cuisine;
        });
        setCuisineCache(newCache);
      }
    } catch (error) {
      console.error('Error detecting cuisines:', error);
    }
  };

  const getCuisineForPlace = (place: AIRecommendation) => {
    return cuisineCache[place.place_id] || null;
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  const getPhotoUrl = (photoReference: string) => {
    if (!photoReference) return '/placeholder.svg';
    return '/placeholder.svg';
  };

  const formatAddress = (fullAddress: string) => {
    // Split the address by commas
    const parts = fullAddress.split(', ');
    
    // For US addresses, typically: "Street, City, State ZIP, Country"
    if (parts.length >= 3) {
      const lastPart = parts[parts.length - 1];
      if (lastPart === 'United States' || lastPart === 'USA') {
        // US address: return "City, State"
        const statePart = parts[parts.length - 2];
        const city = parts[parts.length - 3];
        return `${city}, ${statePart.split(' ')[0]}`; // Remove ZIP code
      } else {
        // International address: return "City, Country"
        const country = lastPart;
        const city = parts[parts.length - 2];
        return `${city}, ${country}`;
      }
    }
    
    // Fallback to last two parts
    return parts.slice(-2).join(', ');
  };

  const getCuisineFromTypes = (types: string[]) => {
    if (!types) return null;
    
    // Filter out generic location/business types that aren't cuisine-specific
    const excludedTypes = [
      'restaurant', 'food', 'establishment', 'point_of_interest', 
      'store', 'premise', 'place_of_worship', 'tourist_attraction',
      'lodging', 'shopping_mall', 'gas_station', 'parking',
      'atm', 'bank', 'pharmacy', 'hospital', 'school'
    ];
    
    // Look for cuisine-specific types
    const cuisineType = types.find(type => 
      !excludedTypes.includes(type) && 
      !type.includes('_store') && 
      !type.includes('_dealer') &&
      !type.includes('_repair')
    );
    
    return cuisineType ? cuisineType.replace(/_/g, ' ') : null;
  };

  const getCurrentDayHours = (place: AIRecommendation) => {
    if (!place.opening_hours?.weekday_text) return null;
    
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Convert JS day to Google's format (0 = Monday)
    const googleDay = dayMap[today];
    
    const todayHours = place.opening_hours.weekday_text[googleDay];
    if (!todayHours) return null;
    
    // Extract just the hours part (after the colon)
    const match = todayHours.match(/:\s*(.+)/);
    return match ? match[1].trim() : todayHours;
  };

  const handleAddToWishlist = async (place: AIRecommendation) => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }
    
    setAddingToWishlist(prev => ({ ...prev, [place.place_id]: true }));
    
    try {
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: place.name,
            address: place.formatted_address,
            city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
            country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
            cuisine: getCuisineForPlace(place) || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
            notes: 'Added from Personalized Recommendations'
          }
        });
        if (aiData && aiData.michelinStars !== null) {
          michelinStars = aiData.michelinStars;
        }
      } catch (error) {
        console.log('Could not determine Michelin stars:', error);
      }

      // Parse address components properly
      const addressParts = place.formatted_address.split(',').map(part => part.trim());
      let city = '';
      let country = '';
      
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1];
        const secondLastPart = addressParts[addressParts.length - 2];
        
        if (lastPart.match(/^(USA|United States|US)$/i)) {
          country = 'United States';
          city = addressParts[1] || '';
        } else if (lastPart.length <= 4 && /^\d/.test(lastPart)) {
          country = secondLastPart;
          city = addressParts[addressParts.length - 3] || '';
        } else {
          country = lastPart;
          city = secondLastPart || '';
        }
      }

      const restaurantFormData = {
        name: place.name,
        address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
        city: city,
        country: country,
        cuisine: getCuisineForPlace(place) || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: place.price_level || place.price_range,
        michelinStars: michelinStars,
        notes: 'Added from Personalized Recommendations',
        dateVisited: '',
        photos: [],
        isWishlist: true,
      };
      
      await addRestaurant(restaurantFormData);
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error(`Failed to add to wishlist: ${error.message}`);
    } finally {
      setAddingToWishlist(prev => ({ ...prev, [place.place_id]: false }));
    }
  };

  const handleShowDetails = (place: AIRecommendation) => {
    // Convert Google Places data to Restaurant format for the modal
    const restaurant = {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating || 0,
      reviewCount: place.user_ratings_total,
      priceRange: place.price_level || place.price_range || 2,
      isOpen: place.opening_hours?.open_now,
      phoneNumber: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours?.weekday_text || [],
      photos: place.photos?.map(photo => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=AIzaSyD_replace_with_your_key`
      ).filter(Boolean) || [],
      location: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      cuisine: getCuisineForPlace(place),
      googleMapsUrl: place.google_maps_url
    };
    
    setSelectedRestaurant(restaurant);
    setShowDetailsModal(true);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sign in for Personalized Recommendations</h3>
          <p className="text-muted-foreground">
            Rate some restaurants to get personalized recommendations based on your preferences!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations.length && !isLoading && !error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Get AI-Powered Restaurant Recommendations</h3>
          <p className="text-muted-foreground mb-4">
            Get personalized recommendations based on your rated restaurants and dining preferences!
          </p>
          <Button 
            onClick={generateRecommendations}
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? 'Analyzing your preferences...' : 'Generate Recommendations'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI-Powered Personalized Recommendations
          </CardTitle>
          {preferences && (
            <p className="text-sm text-muted-foreground">
              Based on your {preferences.reasoning || 'dining preferences and ratings'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={generateRecommendations} 
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? 'Finding recommendations...' : 'Refresh Recommendations'}
            </Button>
          </div>

          
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-primary py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="font-medium">Analyzing your dining preferences...</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <RecommendationCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {!isLoading && recommendations.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((place) => (
                <Card key={place.place_id} className="bg-gray-900 border-gray-800 text-white hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    {/* Header with restaurant name and heart icon */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1 mr-2">
                        {place.name}
                      </h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        onClick={() => handleAddToWishlist(place)}
                        disabled={addingToWishlist[place.place_id]}
                      >
                        <Heart className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Rating */}
                    {place.rating && (
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-lg font-semibold text-white">{place.rating}</span>
                        {place.user_ratings_total && (
                          <span className="text-gray-400 text-sm">
                            ({place.user_ratings_total})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price Range */}
                    <div className="mb-3">
                      <span className="text-green-400 font-semibold text-lg">
                        {getPriceDisplay(place.price_range || place.price_level)}
                      </span>
                    </div>

                    {/* Opening Hours */}
                    {(place.opening_hours?.open_now !== undefined || getCurrentDayHours(place)) && (
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300 text-sm">
                          {getCurrentDayHours(place) ? (
                            `Today: ${getCurrentDayHours(place)}`
                          ) : (
                            `Today: ${place.opening_hours?.open_now ? 'Open' : 'Closed'}`
                          )}
                        </span>
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm line-clamp-1">
                        {formatAddress(place.formatted_address)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-gray-600 text-gray-300 bg-gray-900 hover:bg-gray-800"
                        onClick={() => handleShowDetails(place)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <a 
                        href={`tel:${place.formatted_phone_number || ''}`}
                        className="flex items-center justify-center px-3 py-2 border border-gray-600 rounded-md hover:bg-gray-800 transition-colors"
                      >
                        <Phone className="h-4 w-4 text-gray-300" />
                      </a>
                      <a 
                        href={place.google_maps_url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 border border-gray-600 rounded-md hover:bg-gray-800 transition-colors"
                      >
                        <Globe className="h-4 w-4 text-gray-300" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !error && recommendations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {error || 'No recommendations found. Try rating more restaurants or check back later.'}
              </p>
              <Button 
                onClick={generateRecommendations} 
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? 'Generating recommendations...' : 'Try Again'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restaurant Details Modal */}
      <RestaurantDetailsModal
        restaurant={selectedRestaurant}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        canAddToWishlist={true}
      />
    </div>
  );
}
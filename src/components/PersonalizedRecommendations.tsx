import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Restaurant } from '@/types/restaurant';

interface RecommendationEngine {
  getPersonalizedRecommendations: () => Promise<GooglePlaceResult[]>;
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
  };
}

export function PersonalizedRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<GooglePlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState<{
    favoriteCuisines: string[];
    averageRating: number;
    preferredPriceRange: number;
    location?: { lat: number; lng: number };
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserPreferences();
      generateRecommendations();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      // Get user's rated restaurants to analyze preferences
      const { data: userRestaurants, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .not('rating', 'is', null);

      if (error) throw error;

      if (userRestaurants && userRestaurants.length > 0) {
        // Analyze user preferences
        const cuisines = userRestaurants.map(r => r.cuisine);
        const favoriteCuisines = [...new Set(cuisines)];
        const averageRating = userRestaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / userRestaurants.length;
        const averagePriceRange = userRestaurants
          .filter(r => r.price_range)
          .reduce((sum, r) => sum + (r.price_range || 0), 0) / userRestaurants.filter(r => r.price_range).length;

        setUserPreferences({
          favoriteCuisines,
          averageRating,
          preferredPriceRange: Math.round(averagePriceRange) || 2,
        });
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const generateRecommendations = async () => {
    if (!user || !userPreferences) return;

    setIsLoading(true);
    try {
      // Get user's location
      const location = await getCurrentLocation();
      
      // Search for restaurants based on user preferences
      const searchQueries = userPreferences.favoriteCuisines.slice(0, 3).map(cuisine => 
        `${cuisine} restaurants near me`
      );

      const recommendations: GooglePlaceResult[] = [];

      for (const query of searchQueries) {
        const { data, error } = await supabase.functions.invoke('google-places-search', {
          body: {
            query,
            type: 'search',
            location: location ? `${location.lat},${location.lng}` : undefined,
          }
        });

        if (!error && data.status === 'OK') {
          // Filter results based on user preferences
          const filteredResults = data.results
            .filter((place: GooglePlaceResult) => {
              const hasGoodRating = !place.rating || place.rating >= userPreferences.averageRating - 0.5;
              const matchesPriceRange = !place.price_level || 
                Math.abs(place.price_level - userPreferences.preferredPriceRange) <= 1;
              
              return hasGoodRating && matchesPriceRange;
            })
            .slice(0, 2); // Limit per cuisine

          recommendations.push(...filteredResults);
        }
      }

      // Remove duplicates and limit to 6 recommendations
      const uniqueRecommendations = recommendations
        .filter((place, index, arr) => 
          arr.findIndex(p => p.place_id === place.place_id) === index
        )
        .slice(0, 6);

      setRecommendations(uniqueRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
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
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
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

  if (!userPreferences) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Rate Restaurants to Get Recommendations</h3>
          <p className="text-muted-foreground">
            Start rating restaurants to receive personalized recommendations tailored to your taste!
          </p>
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
            Personalized Recommendations
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Based on your ratings and preferences: {userPreferences.favoriteCuisines.join(', ')}
          </p>
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

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((place) => (
                <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {place.photos && place.photos[0] && (
                      <div className="mb-3 aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={getPhotoUrl(place.photos[0].photo_reference)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <h3 className="font-semibold text-sm mb-2 line-clamp-1">{place.name}</h3>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {place.formatted_address}
                      </span>
                    </div>

                    {place.rating && (
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{place.rating}</span>
                        {place.user_ratings_total && (
                          <span className="text-xs text-muted-foreground">
                            ({place.user_ratings_total})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {getPriceDisplay(place.price_level)}
                      </Badge>
                      
                      {place.opening_hours?.open_now !== undefined && (
                        <Badge 
                          variant={place.opening_hours.open_now ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {place.opening_hours.open_now ? "Open" : "Closed"}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No recommendations found. Try rating more restaurants or expand your search area.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
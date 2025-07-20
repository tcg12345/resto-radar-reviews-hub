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
  recommendation_reason?: string;
  confidence_score?: number;
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
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's current location
      const location = await getCurrentLocation();
      
      // Get user's rated restaurants for AI analysis
      const { data: userRestaurants, error } = await supabase
        .from('restaurants')
        .select('name, cuisine, rating, latitude, longitude, city, address, notes')
        .eq('user_id', user.id)
        .not('rating', 'is', null);

      if (error) throw error;

      if (!userRestaurants || userRestaurants.length === 0) {
        setRecommendations([]);
        return;
      }

      console.log(`Generating AI recommendations based on ${userRestaurants.length} rated restaurants`);

      // Use AI to generate personalized recommendations
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-personalized-recommendations', {
        body: {
          userRestaurants,
          userLocation: location,
          limit: 8
        }
      });

      if (aiError) {
        console.error('AI recommendation error:', aiError);
        throw new Error('Failed to generate AI recommendations');
      }

      if (aiResponse?.recommendations) {
        setRecommendations(aiResponse.recommendations);
        console.log(`Generated ${aiResponse.recommendations.length} AI-powered recommendations`);
        
        // Update user preferences with AI insights
        if (aiResponse.preferences) {
          setUserPreferences({
            favoriteCuisines: aiResponse.preferences.preferredCuisines,
            averageRating: aiResponse.preferences.ratingThreshold,
            preferredPriceRange: aiResponse.preferences.pricePreference === 'budget' ? 1 :
                                aiResponse.preferences.pricePreference === 'moderate' ? 2 :
                                aiResponse.preferences.pricePreference === 'upscale' ? 3 : 4,
            location
          });
        }
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fallback to simple recommendations if AI fails
      await loadUserPreferences();
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

                    {place.recommendation_reason && (
                      <div className="mb-3 p-2 bg-primary/5 rounded-lg">
                        <p className="text-xs text-muted-foreground italic">
                          "{place.recommendation_reason}"
                        </p>
                        {place.confidence_score && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="text-xs text-primary font-medium">
                              {place.confidence_score >= 8 ? 'Highly Recommended' : 
                               place.confidence_score >= 6 ? 'Good Match' : 'Potential Match'}
                            </div>
                          </div>
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
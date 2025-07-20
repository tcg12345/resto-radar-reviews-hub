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

interface AIRecommendation extends GooglePlaceResult {
  ai_reasoning?: string;
  confidence_score?: number;
  match_factors?: string[];
  website?: string;
  google_maps_url?: string;
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
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!photoReference) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`;
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
                  <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {!isLoading && recommendations.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((place) => (
                <Card key={place.place_id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {place.photos && place.photos[0] && place.photos[0].photo_reference && (
                      <div className="mb-3 aspect-video bg-muted rounded-lg overflow-hidden">
                        <img 
                          src={getPhotoUrl(place.photos[0].photo_reference)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image container if it fails to load
                            const container = e.currentTarget.parentElement;
                            if (container) container.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{place.name}</h3>
                        {place.confidence_score && (
                          <div className="flex items-center gap-1 mb-2">
                            <div className={`w-2 h-2 rounded-full ${
                              place.confidence_score >= 8 ? 'bg-green-500' : 
                              place.confidence_score >= 6 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`} />
                            <span className="text-xs text-muted-foreground">
                              {place.confidence_score}/10 match
                            </span>
                          </div>
                        )}
                      </div>

                      {place.ai_reasoning && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded text-xs">
                          <p className="text-blue-700 dark:text-blue-300 line-clamp-2">
                            💡 {place.ai_reasoning}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {formatAddress(place.formatted_address)}
                        </span>
                      </div>

                      {place.rating && (
                        <div className="flex items-center gap-2">
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
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {getPriceDisplay(place.price_level)}
                          </Badge>
                          
                          {/* Website and Directions Buttons */}
                          <div className="flex gap-1">
                            {place.website && (
                              <a 
                                href={place.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors hover-scale"
                              >
                                Website
                              </a>
                            )}
                            <a 
                              href={place.google_maps_url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors hover-scale"
                            >
                              Directions
                            </a>
                          </div>
                        </div>
                        
                        {place.opening_hours?.open_now !== undefined && (
                          <Badge 
                            variant={place.opening_hours.open_now ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {place.opening_hours.open_now ? "Open" : "Closed"}
                          </Badge>
                        )}
                      </div>
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
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Lightbulb, Heart, Clock, Globe, Phone, Eye } from 'lucide-react';
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
                <Card key={place.place_id} className="bg-gray-900 border-gray-800 text-white hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    {/* Header with restaurant name and heart icon */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1 mr-2">
                        {place.name}
                      </h3>
                      <Heart className="h-5 w-5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0" />
                    </div>

                    {/* AI Reasoning */}
                    {place.ai_reasoning && (
                      <div className="bg-blue-900/30 border border-blue-800/50 p-3 rounded-lg mb-3">
                        <p className="text-blue-200 text-sm">
                          💡 {place.ai_reasoning}
                        </p>
                        {place.confidence_score && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${
                              place.confidence_score >= 8 ? 'bg-green-500' : 
                              place.confidence_score >= 6 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`} />
                            <span className="text-xs text-blue-300">
                              {place.confidence_score}/10 match
                            </span>
                          </div>
                        )}
                      </div>
                    )}

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
                    {place.opening_hours?.open_now !== undefined && (
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-300 text-sm">
                          Today: {place.opening_hours.open_now ? 'Open' : 'Closed'}
                        </span>
                      </div>
                    )}

                    {/* Website */}
                    {place.website && (
                      <div className="flex items-center gap-2 mb-3">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <a 
                          href={place.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline truncate"
                        >
                          {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      </div>
                    )}

                    {/* Address */}
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm line-clamp-1">
                        {formatAddress(place.formatted_address)}
                      </span>
                    </div>

                    {/* Cuisine Badge */}
                    {place.types && place.types.find(type => type !== 'restaurant' && type !== 'food' && type !== 'establishment') && (
                      <div className="mb-4">
                        <Badge variant="outline" className="border-gray-600 text-gray-300 bg-gray-800">
                          {place.types.find(type => type !== 'restaurant' && type !== 'food' && type !== 'establishment')?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 border-gray-600 text-gray-300 bg-gray-900 hover:bg-gray-800"
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
    </div>
  );
}
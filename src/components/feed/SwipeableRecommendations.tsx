import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, MapPin, Clock, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { LazyImage } from '@/components/LazyImage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';

interface RecommendedRestaurant {
  place_id: string;
  name: string;
  rating: number;
  formatted_address: string;
  photos?: string[];
  price_level?: number;
  cuisine?: string;
  ai_reasoning?: string;
  distance?: string;
  opening_hours?: {
    open_now?: boolean;
  };
}

export function SwipeableRecommendations() {
  const { user } = useAuth();
  const { addRestaurant } = useRestaurants();
  const [recommendations, setRecommendations] = useState<RecommendedRestaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [addingToWishlist, setAddingToWishlist] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get user's rated restaurants first
      const { data: ratedRestaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_wishlist', false)
        .not('rating', 'is', null)
        .limit(20);

      if (!ratedRestaurants || ratedRestaurants.length === 0) {
        setRecommendations([]);
        return;
      }

      // Get current location
      const userLocation = await getCurrentLocation();

      // Get AI recommendations
      const { data: aiResponse } = await supabase.functions.invoke('ai-personalized-recommendations', {
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
          userLocation,
          limit: 10
        }
      });

      if (aiResponse?.recommendations) {
        setRecommendations(aiResponse.recommendations);
      }
    } catch (error) {
      console.error('Error loading recommendations:', error);
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
          () => resolve(null),
          { timeout: 5000 }
        );
      } else {
        resolve(null);
      }
    });
  };

  const handleSwipeNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleAddToWishlist = async (restaurant: RecommendedRestaurant) => {
    if (!user) return;

    setAddingToWishlist(true);
    try {
      const addressParts = restaurant.formatted_address.split(',').map(part => part.trim());
      const city = addressParts[1] || '';
      const country = addressParts[addressParts.length - 1] || '';

      await addRestaurant({
        name: restaurant.name,
        address: addressParts[0] || restaurant.formatted_address,
        city,
        country,
        cuisine: restaurant.cuisine || 'Restaurant',
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: restaurant.price_level,
        michelinStars: undefined,
        notes: `Added from recommendations: ${restaurant.ai_reasoning || 'AI suggested'}`,
        dateVisited: '',
        photos: [],
        isWishlist: true,
      });

      toast.success('Added to wishlist!');
      handleSwipeNext(); // Auto-advance to next recommendation
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setAddingToWishlist(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Loading Recommendations...</h3>
        </div>
        <div className="h-40 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Recommendations</h3>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Rate some restaurants to get personalized recommendations!
        </p>
        <Button size="sm" onClick={loadRecommendations}>
          Get Recommendations
        </Button>
      </div>
    );
  }

  const currentRestaurant = recommendations[currentIndex];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Just for You</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} of {recommendations.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwipePrevious}
              disabled={currentIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwipeNext}
              disabled={currentIndex === recommendations.length - 1}
              className="h-8 w-8 p-0"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="bg-card border-0 shadow-lg overflow-hidden">
        <div className="relative">
          {currentRestaurant.photos && currentRestaurant.photos.length > 0 ? (
            <div className="h-48 relative">
              <LazyImage
                src={currentRestaurant.photos[0]}
                alt={currentRestaurant.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h4 className="text-white font-bold text-xl mb-1">{currentRestaurant.name}</h4>
                <div className="flex items-center gap-2 text-white/90">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{currentRestaurant.rating}</span>
                  {currentRestaurant.price_level && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                      {'$'.repeat(currentRestaurant.price_level)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <div className="text-center text-white">
                <h4 className="font-bold text-xl mb-2">{currentRestaurant.name}</h4>
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{currentRestaurant.rating}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-3">
            {currentRestaurant.cuisine && (
              <Badge variant="outline" className="text-xs">
                {currentRestaurant.cuisine}
              </Badge>
            )}

            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-sm text-muted-foreground leading-tight">
                {currentRestaurant.formatted_address}
              </span>
            </div>

            {currentRestaurant.distance && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{currentRestaurant.distance}</span>
                {currentRestaurant.opening_hours?.open_now && (
                  <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                    Open now
                  </Badge>
                )}
              </div>
            )}

            {currentRestaurant.ai_reasoning && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  <span className="font-medium">Why we picked this:</span> {currentRestaurant.ai_reasoning}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleAddToWishlist(currentRestaurant)}
                disabled={addingToWishlist}
                className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
              >
                <Heart className="h-4 w-4 mr-2" />
                {addingToWishlist ? 'Adding...' : 'Add to Wishlist'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSwipeNext}>
                Pass
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1 mt-4">
        {recommendations.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
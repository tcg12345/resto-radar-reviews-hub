import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MichelinStars } from '@/components/MichelinStars';

interface PopularRestaurant {
  place_id: string;
  name: string;
  cuisine?: string;
  city?: string;
  country?: string;
  avg_rating: number;
  review_count: number;
  price_range?: number;
  michelin_stars?: number;
  photo_url?: string;
  has_expert_reviews: boolean;
}

interface PopularRestaurantsCarouselProps {
  title?: string;
  userLocation?: { latitude: number; longitude: number };
}

export function PopularRestaurantsCarousel({ 
  title = "Trending Near You",
  userLocation 
}: PopularRestaurantsCarouselProps) {
  const [restaurants, setRestaurants] = useState<PopularRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPopularRestaurants();
  }, [userLocation]);

  const loadPopularRestaurants = async () => {
    try {
      // Get restaurants with high ratings and multiple reviews
      const { data: topRated } = await supabase
        .from('restaurants')
        .select(`
          google_place_id, name, cuisine, city, country, rating, price_range, michelin_stars, photos
        `)
        .not('google_place_id', 'is', null)
        .not('rating', 'is', null)
        .gte('rating', 7)
        .eq('is_wishlist', false)
        .order('rating', { ascending: false })
        .limit(20);

      // Get expert review counts
      const { data: expertIds } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert');

      const expertUserIds = expertIds?.map(e => e.user_id) || [];

      // Group by place_id and calculate stats
      const restaurantStats = new Map<string, {
        place_id: string;
        name: string;
        cuisine?: string;
        city?: string;
        country?: string;
        ratings: number[];
        price_range?: number;
        michelin_stars?: number;
        photo_url?: string;
        expert_reviews: number;
      }>();

      topRated?.forEach(r => {
        if (!r.google_place_id) return;
        
        const existing = restaurantStats.get(r.google_place_id);
        if (existing) {
          existing.ratings.push(r.rating);
        } else {
          restaurantStats.set(r.google_place_id, {
            place_id: r.google_place_id,
            name: r.name,
            cuisine: r.cuisine,
            city: r.city,
            country: r.country,
            ratings: [r.rating],
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            photo_url: r.photos?.[0],
            expert_reviews: 0
          });
        }
      });

      // Check for expert reviews
      if (expertUserIds.length > 0) {
        const placeIds = Array.from(restaurantStats.keys());
        
        const { data: expertReviews } = await supabase
          .from('user_reviews')
          .select('restaurant_place_id')
          .in('user_id', expertUserIds)
          .in('restaurant_place_id', placeIds);

        const { data: expertRatings } = await supabase
          .from('restaurants')
          .select('google_place_id')
          .in('user_id', expertUserIds)
          .in('google_place_id', placeIds)
          .not('rating', 'is', null);

        // Count expert reviews per place
        [...(expertReviews || []), ...(expertRatings || [])].forEach(r => {
          const placeId = ('restaurant_place_id' in r) ? r.restaurant_place_id : r.google_place_id;
          const restaurant = restaurantStats.get(placeId);
          if (restaurant) {
            restaurant.expert_reviews++;
          }
        });
      }

      // Convert to final format and sort
      const popularRestaurants: PopularRestaurant[] = Array.from(restaurantStats.values())
        .filter(r => r.ratings.length >= 2) // At least 2 reviews
        .map(r => ({
          place_id: r.place_id,
          name: r.name,
          cuisine: r.cuisine,
          city: r.city,
          country: r.country,
          avg_rating: r.ratings.reduce((a, b) => a + b, 0) / r.ratings.length,
          review_count: r.ratings.length,
          price_range: r.price_range,
          michelin_stars: r.michelin_stars,
          photo_url: r.photo_url,
          has_expert_reviews: r.expert_reviews > 0
        }))
        .sort((a, b) => {
          // Sort by expert reviews first, then by rating
          if (a.has_expert_reviews !== b.has_expert_reviews) {
            return a.has_expert_reviews ? -1 : 1;
          }
          return b.avg_rating - a.avg_rating;
        })
        .slice(0, 10);

      setRestaurants(popularRestaurants);
    } catch (error) {
      console.error('Error loading popular restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return null;
    return '$'.repeat(Math.min(priceLevel, 4));
  };

  const handleRestaurantClick = (restaurant: PopularRestaurant) => {
    navigate(`/restaurant/${restaurant.place_id}?name=${encodeURIComponent(restaurant.name)}`);
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          {title}
        </h2>
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[240px] h-[200px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {title}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/search/global')}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View All
        </Button>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2">
        {restaurants.map((restaurant) => (
          <Card 
            key={restaurant.place_id}
            className="min-w-[240px] cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleRestaurantClick(restaurant)}
          >
            {restaurant.photo_url && (
              <div className="relative h-24 overflow-hidden rounded-t-lg">
                <img 
                  src={restaurant.photo_url} 
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
                {restaurant.has_expert_reviews && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/90 text-primary-foreground">
                      Expert Reviewed
                    </Badge>
                  </div>
                )}
              </div>
            )}
            
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold line-clamp-1">
                {restaurant.name}
              </CardTitle>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-sm font-medium">
                    {restaurant.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({restaurant.review_count})
                  </span>
                </div>
                
                {restaurant.price_range && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {getPriceDisplay(restaurant.price_range)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {restaurant.cuisine && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {restaurant.cuisine}
                  </Badge>
                )}
                {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                  <MichelinStars stars={restaurant.michelin_stars} size="sm" />
                )}
              </div>
              
              {(restaurant.city || restaurant.country) && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {restaurant.city && restaurant.country 
                      ? `${restaurant.city}, ${restaurant.country}` 
                      : restaurant.city || restaurant.country}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
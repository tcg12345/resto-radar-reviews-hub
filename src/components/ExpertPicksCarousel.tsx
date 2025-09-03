import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MichelinStars } from '@/components/MichelinStars';

interface PickedRestaurant {
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
}

export function ExpertPicksCarousel() {
  const [picks, setPicks] = useState<PickedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadExpertPicks();
  }, []);

  const loadExpertPicks = async () => {
    try {
      // Get expert user IDs (excluding current user if applicable)
      const { data: expertRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'expert');
      let expertIds = expertRoles?.map(r => r.user_id) || [];
      if (user && expertIds.includes(user.id)) {
        expertIds = expertIds.filter(id => id !== user.id);
      }
      if (expertIds.length === 0) {
        setPicks([]);
        setLoading(false);
        return;
      }
      // Fetch recent expert ratings and reviews
      const { data: expertRatings } = await supabase
        .from('restaurants')
        .select('google_place_id, name, cuisine, city, country, rating, price_range, michelin_stars, photos, created_at')
        .in('user_id', expertIds)
        .not('rating', 'is', null)
        .eq('is_wishlist', false)
        .gte('rating', 7)
        .order('created_at', { ascending: false })
        .limit(20);
      const { data: expertReviews } = await supabase
        .from('user_reviews')
        .select('restaurant_place_id, restaurant_name, overall_rating, photos, created_at')
        .in('user_id', expertIds)
        .gte('overall_rating', 7)
        .order('created_at', { ascending: false })
        .limit(20);
      // Group by place_id and accumulate data
      const pickMap = new Map<string, {
        place_id: string;
        name: string;
        cuisine?: string;
        city?: string;
        country?: string;
        ratings: number[];
        price_range?: number;
        michelin_stars?: number;
        photo_url?: string;
        latest_date: string;
      }>();
      (expertRatings || []).forEach(r => {
        if (!r.google_place_id) return;
        const pid = r.google_place_id;
        const existing = pickMap.get(pid);
        const ratingVal = r.rating;
        if (existing) {
          existing.ratings.push(ratingVal);
          if (new Date(r.created_at).getTime() > new Date(existing.latest_date).getTime()) {
            existing.latest_date = r.created_at;
          }
          if (!existing.photo_url && r.photos && r.photos.length > 0) {
            existing.photo_url = r.photos[0];
          }
        } else {
          pickMap.set(pid, {
            place_id: pid,
            name: r.name,
            cuisine: r.cuisine,
            city: r.city,
            country: r.country,
            ratings: [ratingVal],
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            photo_url: r.photos?.[0] || undefined,
            latest_date: r.created_at
          });
        }
      });
      (expertReviews || []).forEach(rv => {
        if (!rv.restaurant_place_id) return;
        const pid = rv.restaurant_place_id;
        const existing = pickMap.get(pid);
        const ratingVal = rv.overall_rating;
        if (existing) {
          existing.ratings.push(ratingVal);
          if (new Date(rv.created_at).getTime() > new Date(existing.latest_date).getTime()) {
            existing.latest_date = rv.created_at;
          }
          if (!existing.photo_url && rv.photos && rv.photos.length > 0) {
            existing.photo_url = rv.photos[0];
          }
          if (!existing.name) {
            existing.name = rv.restaurant_name;
          }
        } else {
          pickMap.set(pid, {
            place_id: pid,
            name: rv.restaurant_name,
            cuisine: undefined,
            city: undefined,
            country: undefined,
            ratings: [ratingVal],
            price_range: undefined,
            michelin_stars: undefined,
            photo_url: rv.photos?.[0] || undefined,
            latest_date: rv.created_at
          });
        }
      });
      // Build list and sort by most recent activity
      let picksList: PickedRestaurant[] = Array.from(pickMap.values()).map(item => ({
        place_id: item.place_id,
        name: item.name,
        cuisine: item.cuisine,
        city: item.city,
        country: item.country,
        avg_rating: item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length,
        review_count: item.ratings.length,
        price_range: item.price_range,
        michelin_stars: item.michelin_stars,
        photo_url: item.photo_url
      }));
      picksList.sort((a, b) => {
        const dateA = new Date(pickMap.get(a.place_id)!.latest_date).getTime();
        const dateB = new Date(pickMap.get(b.place_id)!.latest_date).getTime();
        return dateB - dateA;
      });
      picksList = picksList.slice(0, 10);
      setPicks(picksList);
    } catch (error) {
      console.error('Error loading expert picks:', error);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (placeId: string, name: string) => {
    navigate(`/restaurant/${placeId}?name=${encodeURIComponent(name)}`);
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Expert Picks
        </h2>
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[240px] h-[200px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (picks.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Expert Picks
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/expert-ratings')}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View All
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {picks.map(place => (
          <Card
            key={place.place_id}
            className="min-w-[240px] cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleNavigate(place.place_id, place.name)}
          >
            {place.photo_url && (
              <div className="relative h-24 overflow-hidden rounded-t-lg">
                <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold line-clamp-1">
                {place.name}
              </CardTitle>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-primary fill-primary" />
                  <span className="text-sm font-medium">{place.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({place.review_count})</span>
                </div>
                {place.price_range && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {'$'.repeat(Math.min(place.price_range, 4))}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center gap-2 mb-2">
                {place.cuisine && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {place.cuisine}
                  </Badge>
                )}
                {place.michelin_stars && place.michelin_stars > 0 && (
                  <MichelinStars stars={place.michelin_stars} size="sm" />
                )}
              </div>
              {(place.city || place.country) && (
                <p className="text-xs text-muted-foreground">
                  {place.city && place.country ? `${place.city}, ${place.country}` : place.city || place.country}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
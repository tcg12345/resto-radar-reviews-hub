import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GemRestaurant {
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

export function HiddenGemsCarousel() {
  const [gems, setGems] = useState<GemRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHiddenGems();
  }, []);

  const loadHiddenGems = async () => {
    try {
      // Fetch top candidates (high ratings)
      const { data: topCandidates } = await supabase
        .from('restaurants')
        .select('google_place_id, name, cuisine, city, country, rating, price_range, michelin_stars, photos, user_id')
        .not('google_place_id', 'is', null)
        .not('rating', 'is', null)
        .gte('rating', 8)
        .eq('is_wishlist', false)
        .order('rating', { ascending: false })
        .limit(200);
      const { data: expertRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert');
      const expertUserIds = expertRoles?.map(e => e.user_id) || [];

      // Group by place_id and compute review counts
      const stats = new Map<string, {
        place_id: string;
        name: string;
        cuisine?: string;
        city?: string;
        country?: string;
        ratings: number[];
        price_range?: number;
        michelin_stars?: number;
        photo_url?: string;
        expert_count: number;
      }>();
      (topCandidates || []).forEach(r => {
        if (!r.google_place_id) return;
        const pid = r.google_place_id;
        const existing = stats.get(pid);
        if (existing) {
          existing.ratings.push(r.rating);
        } else {
          stats.set(pid, {
            place_id: pid,
            name: r.name,
            cuisine: r.cuisine,
            city: r.city,
            country: r.country,
            ratings: [r.rating],
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            photo_url: r.photos?.[0] || undefined,
            expert_count: 0
          });
        }
        if (expertUserIds.includes(r.user_id)) {
          const entry = stats.get(pid);
          if (entry) entry.expert_count++;
        }
      });

      // Filter to hidden gems: 2-3 total reviews and high average
      let gemsList = Array.from(stats.values())
        .filter(item => item.ratings.length >= 2 && item.ratings.length <= 3)
        .map(item => ({
          place_id: item.place_id,
          name: item.name,
          cuisine: item.cuisine,
          city: item.city,
          country: item.country,
          avg_rating: item.ratings.reduce((a, b) => a + b, 0) / item.ratings.length,
          review_count: item.ratings.length,
          price_range: item.price_range,
          michelin_stars: item.michelin_stars,
          photo_url: item.photo_url,
          has_expert_reviews: item.expert_count > 0
        }))
        .filter(place => place.avg_rating >= 8);
      gemsList.sort((a, b) => {
        if (a.has_expert_reviews !== b.has_expert_reviews) {
          return a.has_expert_reviews ? -1 : 1;
        }
        return b.avg_rating - a.avg_rating;
      });
      gemsList = gemsList.slice(0, 10);
      setGems(gemsList);
    } catch (error) {
      console.error('Error loading hidden gems:', error);
      setGems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (place: GemRestaurant) => {
    navigate(`/restaurant/${place.place_id}?name=${encodeURIComponent(place.name)}`);
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Hidden Gems
        </h2>
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[240px] h-[200px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (gems.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Hidden Gems
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
        {gems.map(place => (
          <Card
            key={place.place_id}
            className="min-w-[240px] cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleClick(place)}
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
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {place.michelin_stars}★
                  </Badge>
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
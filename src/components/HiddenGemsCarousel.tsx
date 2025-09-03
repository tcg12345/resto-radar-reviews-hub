import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Gem, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MichelinStars } from '@/components/MichelinStars';

interface HiddenGem {
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

export function HiddenGemsCarousel() {
  const [gems, setGems] = useState<HiddenGem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadHiddenGems();
  }, []);

  const loadHiddenGems = async () => {
    try {
      // Find restaurants with high ratings but low review counts (hidden gems)
      const { data: gemCandidates } = await supabase
        .from('restaurants')
        .select('google_place_id, name, cuisine, city, country, rating, price_range, michelin_stars, photos, created_at')
        .not('google_place_id', 'is', null)
        .not('rating', 'is', null)
        .gte('rating', 8) // High rated
        .eq('is_wishlist', false)
        .order('created_at', { ascending: false })
        .limit(50);

      // Group by place and count reviews
      const gemMap = new Map<string, {
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

      (gemCandidates || []).forEach(r => {
        if (!r.google_place_id) return;
        const pid = r.google_place_id;
        const existing = gemMap.get(pid);
        if (existing) {
          existing.ratings.push(r.rating);
          if (new Date(r.created_at).getTime() > new Date(existing.latest_date).getTime()) {
            existing.latest_date = r.created_at;
          }
        } else {
          gemMap.set(pid, {
            place_id: pid,
            name: r.name,
            cuisine: r.cuisine,
            city: r.city,
            country: r.country,
            ratings: [r.rating],
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            photo_url: r.photos?.[0] || undefined,
            latest_date: r.created_at
          });
        }
      });

      // Filter for true hidden gems (few reviews but high quality)
      let gemsList: HiddenGem[] = Array.from(gemMap.values())
        .filter(item => item.ratings.length >= 1 && item.ratings.length <= 5) // Limited exposure
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
          photo_url: item.photo_url
        }))
        .sort((a, b) => b.avg_rating - a.avg_rating) // Sort by rating quality
        .slice(0, 10);

      setGems(gemsList);
    } catch (error) {
      console.error('Error loading hidden gems:', error);
      setGems([]);
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
          <Gem className="h-4 w-4" />
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
            onClick={() => handleNavigate(place.place_id, place.name)}
          >
            {place.photo_url && (
              <div className="relative h-24 overflow-hidden rounded-t-lg">
                <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-amber-500/90 text-white">
                    Hidden Gem
                  </Badge>
                </div>
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">
                    {place.city && place.country ? `${place.city}, ${place.country}` : place.city || place.country}
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
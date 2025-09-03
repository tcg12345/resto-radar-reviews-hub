import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExpertRestaurant {
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
  expert_friend_name?: string;
}

export function HiddenGemsCarousel() {
  const [restaurants, setRestaurants] = useState<ExpertRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadExpertFriendRestaurants();
  }, [user]);

  const loadExpertFriendRestaurants = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      const friendIds = friendsData?.map(f => f.user1_id === user.id ? f.user2_id : f.user1_id) || [];

      if (friendIds.length === 0) {
        setRestaurants([]);
        setLoading(false);
        return;
      }

      // Get expert friends
      const { data: expertRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert')
        .in('user_id', friendIds);
      const expertFriendIds = expertRoles?.map(e => e.user_id) || [];

      if (expertFriendIds.length === 0) {
        setRestaurants([]);
        setLoading(false);
        return;
      }

      // Get expert friend profiles
      const { data: expertProfiles } = await supabase
        .from('profiles')
        .select('id, name, username')
        .in('id', expertFriendIds);
      const profileMap = new Map(expertProfiles?.map(p => [p.id, p]) || []);

      // Get restaurants rated by expert friends
      const { data: expertRatings } = await supabase
        .from('restaurants')
        .select('google_place_id, name, cuisine, city, country, rating, price_range, michelin_stars, photos, user_id, created_at')
        .in('user_id', expertFriendIds)
        .not('google_place_id', 'is', null)
        .not('rating', 'is', null)
        .gte('rating', 7)
        .eq('is_wishlist', false)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get expert reviews
      const { data: expertReviews } = await supabase
        .from('user_reviews')
        .select('restaurant_place_id, restaurant_name, overall_rating, user_id, created_at')
        .in('user_id', expertFriendIds)
        .gte('overall_rating', 7)
        .order('created_at', { ascending: false })
        .limit(50);

      // Group by place_id and get the latest rating from expert friends
      const restaurantMap = new Map<string, {
        place_id: string;
        name: string;
        cuisine?: string;
        city?: string;
        country?: string;
        ratings: number[];
        price_range?: number;
        michelin_stars?: number;
        photo_url?: string;
        expert_friend_id: string;
        latest_date: string;
      }>();

      (expertRatings || []).forEach(r => {
        if (!r.google_place_id) return;
        const pid = r.google_place_id;
        const existing = restaurantMap.get(pid);
        if (existing) {
          existing.ratings.push(r.rating);
          if (new Date(r.created_at).getTime() > new Date(existing.latest_date).getTime()) {
            existing.latest_date = r.created_at;
            existing.expert_friend_id = r.user_id;
          }
        } else {
          restaurantMap.set(pid, {
            place_id: pid,
            name: r.name,
            cuisine: r.cuisine,
            city: r.city,
            country: r.country,
            ratings: [r.rating],
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            photo_url: r.photos?.[0] || undefined,
            expert_friend_id: r.user_id,
            latest_date: r.created_at
          });
        }
      });

      (expertReviews || []).forEach(rv => {
        if (!rv.restaurant_place_id) return;
        const pid = rv.restaurant_place_id;
        const existing = restaurantMap.get(pid);
        if (existing) {
          existing.ratings.push(rv.overall_rating);
          if (new Date(rv.created_at).getTime() > new Date(existing.latest_date).getTime()) {
            existing.latest_date = rv.created_at;
            existing.expert_friend_id = rv.user_id;
          }
        } else {
          restaurantMap.set(pid, {
            place_id: pid,
            name: rv.restaurant_name,
            cuisine: undefined,
            city: undefined,
            country: undefined,
            ratings: [rv.overall_rating],
            price_range: undefined,
            michelin_stars: undefined,
            photo_url: undefined,
            expert_friend_id: rv.user_id,
            latest_date: rv.created_at
          });
        }
      });

      // Convert to final format and sort by most recent
      let restaurantsList: ExpertRestaurant[] = Array.from(restaurantMap.values()).map(item => {
        const expertProfile = profileMap.get(item.expert_friend_id);
        return {
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
          has_expert_reviews: true,
          expert_friend_name: expertProfile?.name || expertProfile?.username || 'Expert Friend'
        };
      });

      // Sort by rating and recency
      restaurantsList.sort((a, b) => {
        const dateA = new Date(restaurantMap.get(a.place_id)!.latest_date).getTime();
        const dateB = new Date(restaurantMap.get(b.place_id)!.latest_date).getTime();
        return dateB - dateA;
      });

      restaurantsList = restaurantsList.slice(0, 10);
      setRestaurants(restaurantsList);
    } catch (error) {
      console.error('Error loading expert friend restaurants:', error);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (place: ExpertRestaurant) => {
    navigate(`/restaurant/${place.place_id}?name=${encodeURIComponent(place.name)}`);
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Expert Friends
        </h2>
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[240px] h-[200px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" />
          Expert Friends
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
        {restaurants.map(place => (
          <Card
            key={place.place_id}
            className="min-w-[240px] cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleClick(place)}
          >
            {place.photo_url && (
              <div className="relative h-24 overflow-hidden rounded-t-lg">
                <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1 bg-primary/90 text-primary-foreground">
                    by {place.expert_friend_name}
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
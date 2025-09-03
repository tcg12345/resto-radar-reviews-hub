import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bookmark, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WishlistRestaurant {
  place_id: string;
  name: string;
  cuisine?: string;
  city?: string;
  country?: string;
  price_range?: number;
  michelin_stars?: number;
  photo_url?: string;
}

export function WishlistCarousel() {
  const [savedPlaces, setSavedPlaces] = useState<WishlistRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadWishlist();
  }, [user]);

  const loadWishlist = async () => {
    try {
      if (!user) {
        setSavedPlaces([]);
        setLoading(false);
        return;
      }
      const { data: wishlistData } = await supabase
        .from('restaurants')
        .select('google_place_id, name, cuisine, city, country, price_range, michelin_stars, photos, created_at')
        .eq('user_id', user.id)
        .eq('is_wishlist', true)
        .order('created_at', { ascending: false })
        .limit(15);
      const places = (wishlistData || []).map(item => ({
        place_id: item.google_place_id,
        name: item.name,
        cuisine: item.cuisine || undefined,
        city: item.city || undefined,
        country: item.country || undefined,
        price_range: item.price_range || undefined,
        michelin_stars: item.michelin_stars || undefined,
        photo_url: item.photos?.[0] || undefined
      }));
      setSavedPlaces(places);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setSavedPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (place: WishlistRestaurant) => {
    if (place.place_id) {
      navigate(`/restaurant/${place.place_id}?name=${encodeURIComponent(place.name)}`);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Your Wishlist
        </h2>
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[240px] h-[200px] bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (savedPlaces.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Your Wishlist
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/wishlist')}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          View All
        </Button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {savedPlaces.map(place => (
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
              {/* Wishlist items have no rating display */}
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
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Share2, Link2, MapPin, Star } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  cuisine?: string;
  rating?: number;
  google_place_id?: string | null;
  photos?: string[] | null;
  website?: string | null;
}

export default function ShareRestaurantPage() {
  const { restaurantId } = useParams();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const shareUrl = useMemo(() => {
    const idForUrl = restaurant?.google_place_id || restaurant?.id || restaurantId || '';
    return `${window.location.origin}/restaurant/${encodeURIComponent(idForUrl)}`;
  }, [restaurant, restaurantId]);

  useEffect(() => {
    document.title = restaurant ? `Share ${restaurant.name} | Grubby` : 'Share Restaurant | Grubby';

    const meta = document.querySelector('meta[name="description"]');
    const content = restaurant ? `Share ${restaurant.name} - ${restaurant.cuisine || 'Restaurant'} at ${restaurant.address || ''}` : 'Share a restaurant you love on Grubby.';
    if (meta) (meta as HTMLMetaElement).content = content;
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = content;
      document.head.appendChild(m);
    }
  }, [restaurant]);

  const isValidUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!restaurantId) return;
      setLoading(true);
      try {
        if (isValidUUID(restaurantId)) {
          const { data, error } = await supabase
            .from('restaurants')
            .select('id, name, address, city, country, cuisine, rating, google_place_id, photos, website')
            .eq('id', restaurantId)
            .eq('user_id', user?.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            toast('Restaurant not found');
          }
          setRestaurant(data as Restaurant);
        } else {
          // Not a UUID: attempt to find by google_place_id for current user
          const { data, error } = await supabase
            .from('restaurants')
            .select('id, name, address, city, country, cuisine, rating, google_place_id, photos, website')
            .eq('google_place_id', restaurantId)
            .eq('user_id', user?.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            // Fallback minimal object to allow sharing of external place id
            setRestaurant({ id: restaurantId, name: 'Restaurant', google_place_id: restaurantId } as any);
          } else {
            setRestaurant(data as Restaurant);
          }
        }
      } catch (e) {
        console.error('Failed to load restaurant for sharing:', e);
        toast('Failed to load restaurant');
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [restaurantId, user?.id]);

  const handleBack = () => {
    if (returnUrl) navigate(decodeURIComponent(returnUrl));
    else navigate(-1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Link copied to clipboard');
    } catch {
      toast('Unable to copy link');
    }
  };

  const handleWebShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: restaurant?.name || 'Check this restaurant',
          text: restaurant?.cuisine ? `${restaurant.name} • ${restaurant.cuisine}` : restaurant?.name,
          url: shareUrl,
        });
      } else {
        await handleCopy();
      }
    } catch (e) {
      console.warn('Share canceled or failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-screen-sm mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Share</h1>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{restaurant?.name || 'Restaurant'}</span>
              {restaurant?.rating ? (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-primary" /> {restaurant.rating.toFixed(1)}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {restaurant?.address ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{restaurant.address}</span>
              </div>
            ) : null}
            {restaurant?.cuisine ? (
              <div className="text-sm text-muted-foreground">{restaurant.cuisine}</div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Share link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate text-sm px-3 py-2 rounded-md border border-border bg-muted/30">
                <span className="truncate inline-block align-middle">
                  <Link2 className="h-3.5 w-3.5 inline mr-2 text-muted-foreground" />
                  {shareUrl}
                </span>
              </div>
              <Button variant="secondary" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <Button className="w-full" onClick={handleWebShare}>
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="text-xs text-muted-foreground text-center">
          Sharing creates a link to this restaurant’s detail page.
        </div>
      </main>

      <div className="h-16" />
    </div>
  );
}

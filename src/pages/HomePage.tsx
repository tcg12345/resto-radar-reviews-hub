import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Users, 
  Star,
  Heart,
  ChefHat,
  Sparkles,
  Award,
  Clock,
  User,
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { FeedItemCard } from '@/components/FeedItemCard';
import { FeedItem } from '@/types/feed';
import { LazyImage } from '@/components/LazyImage';

interface HomePageProps {
  onNavigate: (tab: 'places' | 'search' | 'profile') => void;
  onOpenAddRestaurant: () => void;
}

export default function HomePage({ onNavigate, onOpenAddRestaurant }: HomePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingPlaces, setTrendingPlaces] = useState<any[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadFeedData();
      loadTrendingPlaces();
      loadFriendProfiles();
    }
  }, [user]);

  const loadFeedData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data: friendsData } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      const friendIds = friendsData?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      let allFeedItems: FeedItem[] = [];

      if (friendIds.length > 0) {
        const { data: friendRatings } = await supabase
          .from('restaurants')
          .select('*')
          .in('user_id', friendIds)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: friendProfilesData } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', friendIds);
        
        const profileMap = new Map(friendProfilesData?.map(p => [p.id, p]) || []);

        const friendFeedItems = (friendRatings || []).map(r => ({
          id: r.id,
          type: 'friend-rating' as const,
          user_id: r.user_id,
          username: profileMap.get(r.user_id)?.username || 'Unknown',
          name: profileMap.get(r.user_id)?.name || 'Unknown User',
          avatar_url: profileMap.get(r.user_id)?.avatar_url,
          restaurant_name: r.name,
          cuisine: r.cuisine,
          city: r.city,
          country: r.country,
          rating: r.rating,
          michelin_stars: r.michelin_stars,
          price_range: r.price_range,
          photos: r.photos,
          created_at: r.created_at,
          place_id: r.google_place_id,
          google_place_id: r.google_place_id
        }));

        allFeedItems.push(...friendFeedItems);
      }

      const { data: expertRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert');
      
      const expertIds = expertRoles?.map(r => r.user_id) || [];

      if (expertIds.length > 0) {
        const { data: expertReviews } = await supabase
          .from('user_reviews')
          .select('*')
          .in('user_id', expertIds)
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: expertProfiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', expertIds);
        
        const expertProfileMap = new Map(expertProfiles?.map(p => [p.id, p]) || []);

        const expertFeedItems = (expertReviews || []).map(r => ({
          id: r.id,
          type: 'expert-review' as const,
          user_id: r.user_id,
          username: expertProfileMap.get(r.user_id)?.username || 'Expert',
          name: expertProfileMap.get(r.user_id)?.name || 'Expert User',
          avatar_url: expertProfileMap.get(r.user_id)?.avatar_url,
          restaurant_name: r.restaurant_name,
          rating: r.overall_rating,
          review_text: r.review_text,
          photos: r.photos,
          created_at: r.created_at,
          place_id: r.restaurant_place_id,
          google_place_id: r.restaurant_place_id,
          restaurant_address: r.restaurant_address
        }));

        allFeedItems.push(...expertFeedItems);
      }

      allFeedItems.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setFeedItems(allFeedItems);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrendingPlaces = async () => {
    try {
      const { data } = await supabase
        .from('restaurants')
        .select('name, city, cuisine, rating, photos, google_place_id, michelin_stars')
        .not('rating', 'is', null)
        .order('rating', { ascending: false })
        .limit(6);

      setTrendingPlaces(data || []);
    } catch (error) {
      console.error('Error loading trending places:', error);
    }
  };

  const loadFriendProfiles = async () => {
    if (!user) return;
    try {
      const { data: friendsData } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .limit(8);
      
      const friendIds = friendsData?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', friendIds);

        setFriendProfiles(profiles || []);
      }
    } catch (error) {
      console.error('Error loading friend profiles:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero: Curated For You */}
      <section className="pt-6 pb-8 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="font-label text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
              Highly Curated
            </span>
            <h2 className="font-headline text-3xl font-bold mt-1 text-foreground">
              For Your Palette
            </h2>
          </div>
          <button 
            onClick={() => onNavigate('search')}
            className="text-primary font-label text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            View All
          </button>
        </div>

        {/* Trending Cards Carousel */}
        <div className="flex overflow-x-auto gap-5 pb-4 hide-scrollbar -mx-4 px-4 snap-x">
          {trendingPlaces.slice(0, 4).map((place, index) => (
            <div
              key={index}
              className="min-w-[80vw] md:min-w-[380px] snap-center cursor-pointer"
              onClick={() => {
                if (place.google_place_id) {
                  navigate(`/restaurant/${place.google_place_id}?name=${encodeURIComponent(place.name)}`);
                }
              }}
            >
              <div className="relative group rounded-2xl overflow-hidden aspect-[4/5] md:aspect-[3/4] editorial-shadow">
                {place.photos?.[0] ? (
                  <LazyImage
                    src={place.photos[0]}
                    alt={place.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 p-6 w-full">
                  <div className="flex gap-2 mb-3">
                    {place.rating && (
                      <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                        {place.rating.toFixed(1)} / 10
                      </span>
                    )}
                    {place.michelin_stars > 0 && (
                      <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                        ★ Michelin
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-headline text-2xl mb-1">{place.name}</h3>
                  <p className="text-white/80 text-sm font-body">
                    {place.cuisine} • {place.city}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {trendingPlaces.length === 0 && !isLoading && (
            <div className="min-w-[80vw] md:min-w-[380px] snap-center">
              <div className="relative rounded-2xl overflow-hidden aspect-[4/5] md:aspect-[3/4] bg-surface-container-low flex items-center justify-center">
                <div className="text-center p-8">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                  <p className="text-muted-foreground font-body text-sm">
                    Start rating places to get personalized recommendations
                  </p>
                  <Button
                    onClick={onOpenAddRestaurant}
                    className="mt-4 rounded-full"
                    size="sm"
                  >
                    Add Your First Place
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-8 max-w-7xl mx-auto pb-32">
        {/* Main Feed */}
        <section className="lg:col-span-7 space-y-6">
          {/* Recent from Friends */}
          <div className="flex items-center gap-2 mb-2">
            <User className="text-primary" size={22} />
            <h2 className="font-headline text-2xl font-bold text-foreground">Recent from Friends</h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-surface-container-low p-6 rounded-xl">
                  <div className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <div className="bg-surface-container-low p-12 rounded-xl text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-headline font-semibold text-lg mb-2">No Activity Yet</h3>
              <p className="text-sm text-muted-foreground mb-4 font-body">
                Start following friends to see their dining experiences
              </p>
              <Button
                onClick={() => onNavigate('profile')}
                className="rounded-full"
              >
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {feedItems.map((item, index) => (
                <div key={`${item.type}-${index}`} className="bg-surface-container-low rounded-xl transition-colors hover:bg-surface-container-high">
                  <FeedItemCard item={item} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="lg:col-span-5 space-y-6">
          {/* Friend Profiles */}
          {friendProfiles.length > 0 && (
            <div className="bg-surface-container-low rounded-xl p-5">
              <h3 className="font-headline font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Your Friends
              </h3>
              <div className="space-y-2">
                {friendProfiles.slice(0, 5).map(profile => (
                  <button
                    key={profile.id}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                    onClick={() => navigate(`/friend-profile/${profile.id}`)}
                  >
                    <Avatar className="h-10 w-10 border-2 border-primary/10">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(profile.name || profile.username || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate text-foreground">
                      {profile.name || profile.username}
                    </span>
                  </button>
                ))}
              </div>
              {friendProfiles.length > 5 && (
                <button
                  className="w-full mt-3 text-primary text-sm font-semibold hover:opacity-80 transition-opacity"
                  onClick={() => onNavigate('profile')}
                >
                  View all friends
                </button>
              )}
            </div>
          )}

          {/* Trending Places List */}
          <div className="bg-surface-container-low rounded-xl p-5">
            <h3 className="font-headline font-semibold text-lg mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trending Now
            </h3>
            <div className="space-y-3">
              {trendingPlaces.slice(0, 5).map((place, index) => (
                <button
                  key={index}
                  className="w-full flex gap-3 p-2 rounded-xl hover:bg-surface-container-high transition-colors text-left"
                  onClick={() => {
                    if (place.google_place_id) {
                      navigate(`/restaurant/${place.google_place_id}?name=${encodeURIComponent(place.name)}`);
                    }
                  }}
                >
                  {place.photos?.[0] ? (
                    <div className="h-14 w-14 rounded-lg overflow-hidden flex-shrink-0">
                      <LazyImage
                        src={place.photos[0]}
                        alt={place.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1 text-foreground">
                      {place.name}
                      {place.michelin_stars > 0 && (
                        <Star className="h-3 w-3 fill-primary text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-body">
                      {place.cuisine} • {place.city}
                    </div>
                    {place.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span className="text-xs font-semibold text-primary">{place.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
            <h3 className="font-headline font-semibold text-lg flex items-center gap-2 mb-4">
              <ChefHat className="h-4 w-4 text-primary" />
              Quick Actions
            </h3>
            <Button 
              className="w-full rounded-xl mb-2" 
              onClick={onOpenAddRestaurant}
            >
              Add Restaurant
            </Button>
            <Button 
              variant="outline" 
              className="w-full rounded-xl border-primary/20 text-primary hover:bg-primary/5"
              onClick={() => onNavigate('search')}
            >
              Discover Places
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

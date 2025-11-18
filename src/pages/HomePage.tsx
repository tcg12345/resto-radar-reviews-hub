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
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

      // Get user's friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      const friendIds = friendsData?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      let allFeedItems: FeedItem[] = [];

      if (friendIds.length > 0) {
        // Friend ratings
        const { data: friendRatings } = await supabase
          .from('restaurants')
          .select('*')
          .in('user_id', friendIds)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .order('created_at', { ascending: false })
          .limit(10);

        // Friend profiles
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', friendIds);
        
        const profileMap = new Map(friendProfiles?.map(p => [p.id, p]) || []);

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

      // Get expert reviews
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b">
        <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative px-4 py-8 lg:py-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Discover & Share
                </h1>
                <p className="text-muted-foreground mt-2">
                  See what your friends and experts are loving
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{friendProfiles.length}</div>
                  <div className="text-xs text-muted-foreground">Friends</div>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{feedItems.length}</div>
                  <div className="text-xs text-muted-foreground">Updates</div>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-card/50 backdrop-blur">
                <CardContent className="p-4 text-center">
                  <Award className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{trendingPlaces.filter(p => p.michelin_stars).length}</div>
                  <div className="text-xs text-muted-foreground">Michelin</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Latest Activity
              </h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => loadFeedData()}
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Activity Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Start following friends to see their dining experiences
                  </p>
                  <Button onClick={() => onNavigate('profile')}>
                    Find Friends
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-0">
                {feedItems.map((item, index) => (
                  <FeedItemCard 
                    key={`${item.type}-${index}`}
                    item={item}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Friend Profiles */}
            {friendProfiles.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Your Friends
                  </h3>
                  <div className="space-y-2">
                    {friendProfiles.slice(0, 5).map(profile => (
                      <Button
                        key={profile.id}
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => navigate(`/friend-profile/${profile.id}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback>
                            {(profile.name || profile.username || 'U').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {profile.name || profile.username}
                        </span>
                      </Button>
                    ))}
                  </div>
                  {friendProfiles.length > 5 && (
                    <Button 
                      variant="link" 
                      className="w-full mt-2"
                      onClick={() => onNavigate('profile')}
                    >
                      View all friends
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trending Places */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Now
                </h3>
                <div className="space-y-3">
                  {trendingPlaces.slice(0, 5).map((place, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full justify-start p-2 h-auto"
                      onClick={() => {
                        if (place.google_place_id) {
                          navigate(`/restaurant/${place.google_place_id}?name=${encodeURIComponent(place.name)}`);
                        }
                      }}
                    >
                      <div className="flex gap-3 w-full text-left">
                        {place.photos?.[0] && (
                          <div className="relative h-12 w-12 rounded overflow-hidden flex-shrink-0">
                            <LazyImage
                              src={place.photos[0]}
                              alt={place.name}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            {place.name}
                            {place.michelin_stars > 0 && (
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {place.cuisine} • {place.city}
                          </div>
                          {place.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              <span className="text-xs font-medium">{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
              </Card>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  Quick Actions
                </h3>
                <Button 
                  className="w-full" 
                  onClick={onOpenAddRestaurant}
                >
                  Add Restaurant
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigate('search')}
                >
                  Discover Places
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

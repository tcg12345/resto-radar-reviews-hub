import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MapPin, Camera, Edit2, Star, Bookmark, Route, Users, Activity, Share2, Heart, MessageCircle, TrendingUp, MapPinIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useItineraries } from '@/hooks/useItineraries';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProfileStats {
  rated_count: number;
  wishlist_count: number;
  avg_rating: number;
  top_cuisine: string;
  following_count: number;
  followers_count: number;
}

interface RecentActivity {
  id: string;
  name: string;
  address: string;
  rating: number;
  date_visited: string;
  created_at: string;
  google_place_id: string;
  cuisine: string;
}

export default function DesktopProfilePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { friends } = useFriends();
  const { itineraries } = useItineraries();

  const [stats, setStats] = useState<ProfileStats>({
    rated_count: 0,
    wishlist_count: 0,
    avg_rating: 0,
    top_cuisine: '',
    following_count: 0,
    followers_count: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc('get_user_stats', {
          target_user_id: user.id,
        });
        if (error) throw error;
        setStats({
          rated_count: data[0]?.rated_count || 0,
          wishlist_count: data[0]?.wishlist_count || 0,
          avg_rating: data[0]?.avg_rating || 0,
          top_cuisine: data[0]?.top_cuisine || '',
          following_count: friends.length,
          followers_count: friends.length,
        });
      } catch (e) {
        console.error('Error loading stats:', e);
      }
    };
    loadStats();
  }, [user, friends]);

  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) return;
      setLoadingActivity(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('id, name, address, rating, date_visited, created_at, google_place_id, cuisine')
          .eq('user_id', user.id)
          .eq('is_wishlist', false)
          .not('rating', 'is', null)
          .order('created_at', { ascending: false })
          .limit(25);
        if (error) throw error;
        setRecentActivity(data || []);
      } catch (e) {
        console.error('Error loading recent activity:', e);
      } finally {
        setLoadingActivity(false);
      }
    };
    loadRecentActivity();
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1100px] mx-auto py-8 px-6 space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
            <AvatarImage src={profile.avatar_url || ''} alt={profile.username || 'User'} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
              {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{profile.name || profile.username}</h1>
            <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit')}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/profile/edit-photo')}>
              <Camera className="h-4 w-4 mr-2" /> Update Photo
            </Button>
          </div>
          {profile.username && profile.name && (
            <p className="text-muted-foreground mt-1">@{profile.username}</p>
          )}
          {profile.bio && (
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{profile.bio}</p>
          )}
          {profile.home_city && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <MapPin className="h-4 w-4" />
              <span>{profile.home_city}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-4">
        <Button onClick={() => navigate('/rated')} variant="outline" className="h-14 justify-start">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-base font-medium">Rated Restaurants</p>
          </div>
          <span className="text-lg font-bold">{stats.rated_count}</span>
        </Button>
        <Button onClick={() => navigate('/wishlist')} variant="outline" className="h-14 justify-start">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
            <Bookmark className="h-5 w-5 text-orange-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-base font-medium">Want to Try</p>
          </div>
          <span className="text-lg font-bold">{stats.wishlist_count}</span>
        </Button>
        <Button onClick={() => navigate('/travel?view=saved')} variant="outline" className="h-14 justify-start">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
            <Route className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-base font-medium">Itineraries</p>
          </div>
          <span className="text-lg font-bold">{itineraries.length}</span>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Star className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-xl font-bold">{stats.avg_rating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg"><Users className="h-5 w-5 text-green-600" /></div>
          <div>
            <p className="text-xl font-bold">{stats.following_count}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg"><TrendingUp className="h-5 w-5 text-yellow-600" /></div>
          <div>
            <p className="text-xl font-bold">{stats.top_cuisine || '—'}</p>
            <p className="text-xs text-muted-foreground">Top Cuisine</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg"><Heart className="h-5 w-5 text-red-500" /></div>
          <div>
            <p className="text-xl font-bold">{stats.wishlist_count}</p>
            <p className="text-xs text-muted-foreground">Wishlist</p>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" /> Recent Activity
        </h3>
        <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
          {loadingActivity ? (
            <div className="divide-y divide-border">
              {[1,2,3,4].map(i => (
                <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            recentActivity.map(activity => (
              <div key={activity.id} className="px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/restaurant/${activity.id}`)}>
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-background">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || 'User'} />
                    <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                      {profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold">You ranked {activity.name}</p>
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {activity.rating ? activity.rating.toFixed(1) : '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span className="truncate">{activity.address}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); navigate(`/share/restaurant/${activity.id}`); }}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(activity.created_at), 'MMM d')}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-10 text-center text-muted-foreground">No activity yet. Start rating restaurants!</div>
          )}
        </div>
      </div>

      <div className="h-10" />
    </div>
  );
}

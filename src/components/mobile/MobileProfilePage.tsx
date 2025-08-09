import { useState, useEffect } from 'react';
import { Camera, Edit2, Users, MapPin, Crown, Star, Heart, TrendingUp, Activity, ChevronRight, Bookmark, Route, MessageCircle, Share2, MapPinIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useItineraries } from '@/hooks/useItineraries';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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
export function MobileProfilePage() {
  const {
    user,
    profile
  } = useAuth();
  const navigate = useNavigate();
  const {
    friends
  } = useFriends();
  const {
    itineraries
  } = useItineraries();
  const [stats, setStats] = useState<ProfileStats>({
    rated_count: 0,
    wishlist_count: 0,
    avg_rating: 0,
    top_cuisine: '',
    following_count: 0,
    followers_count: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Load user stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;
      try {
        const {
          data,
          error
        } = await supabase.rpc('get_user_stats', {
          target_user_id: user.id
        });
        if (error) throw error;
        setStats({
          rated_count: data[0]?.rated_count || 0,
          wishlist_count: data[0]?.wishlist_count || 0,
          avg_rating: data[0]?.avg_rating || 0,
          top_cuisine: data[0]?.top_cuisine || '',
          following_count: friends.length,
          followers_count: friends.length // Simplified for now
        });
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadStats();
  }, [user, friends]);

  // Load recent activity
  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) return;
      setLoadingActivity(true);
      try {
        const {
          data,
          error
        } = await supabase.from('restaurants').select('id, name, address, rating, date_visited, created_at, google_place_id, cuisine').eq('user_id', user.id).eq('is_wishlist', false).not('rating', 'is', null).order('created_at', {
          ascending: false
        }).limit(25);
        if (error) throw error;
        setRecentActivity(data || []);
      } catch (error) {
        console.error('Error loading recent activity:', error);
      } finally {
        setLoadingActivity(false);
      }
    };
    loadRecentActivity();
  }, [user]);
  if (!user || !profile) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary-glow/10 pt-6 pb-8">
        <div className="px-4 flex flex-col items-center space-y-4">
          {/* Profile Photo */}
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.username || 'User'} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary-glow text-primary-foreground">
                {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button size="sm" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-lg" onClick={() => navigate('/profile/edit-photo')}>
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate('/profile/edit')}>
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            
            {profile.username && profile.name && <p className="text-muted-foreground">@{profile.username}</p>}
            
            {profile.bio && <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">{profile.bio}</p>}
            
            {profile.home_city && <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                <span>{profile.home_city}</span>
              </div>}

            {/* Privacy Badge */}
            <Badge variant={profile.is_public ? "default" : "secondary"} className="mt-2">
              {profile.is_public ? "Public Profile" : "Private Profile"}
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="text-xl font-bold">{stats.following_count}</div>
              <div className="text-xs text-muted-foreground">Following</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{stats.followers_count}</div>
              <div className="text-xs text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">{stats.rated_count}</div>
              <div className="text-xs text-muted-foreground">Rated</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Navigation Buttons */}
        <div className="border-t border-border">
          {/* Rated Restaurants Button */}
          <Button onClick={() => navigate('/rated')} className="w-full h-14 bg-background hover:bg-muted/50 border-0 rounded-none" variant="outline">
            <div className="flex items-center gap-4 w-full px-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-foreground">Rated Restaurants</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{stats.rated_count}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Button>

          <Separator />

          {/* Wishlist Button */}
          <Button onClick={() => navigate('/wishlist')} className="w-full h-14 bg-background hover:bg-muted/50 border-0 rounded-none" variant="outline">
            <div className="flex items-center gap-4 w-full px-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Bookmark className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-foreground">Want to Try</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{stats.wishlist_count}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Button>

          <Separator />

          {/* Itineraries Button */}
          <Button onClick={() => navigate('/travel?view=saved')} className="w-full h-14 bg-background hover:bg-muted/50 border-0 rounded-none" variant="outline">
            <div className="flex items-center gap-4 w-full px-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Route className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-foreground">Itineraries</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">{itineraries.length}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </Button>

          {/* Friends Button */}
          <Button onClick={() => navigate('/mobile/friends')} variant="outline" className="w-full h-16 bg-primary/10 hover:bg-primary/20 border-2 border-primary/20 hover:border-primary/30 transition-all duration-200 my-[7px]">
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-primary rounded-lg">
                <Users className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-lg font-bold text-foreground">{stats.following_count} Friends</p>
                <p className="text-sm text-muted-foreground">View and manage your friends</p>
              </div>
              <div className="text-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Button>
        </div>

        

        {/* Recent Activity - Full Width */}
        <div className="border-t border-border">
          <div className="px-4 py-4 bg-background">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </h3>
          </div>
          
          {loadingActivity ? <div className="divide-y divide-border">
              {[1, 2, 3].map(i => <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse bg-background">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                </div>)}
            </div> : recentActivity.length > 0 ? <div className="divide-y divide-border">
              {recentActivity.map((activity, index) => <div key={activity.id} className="px-4 py-4 bg-background hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/restaurant/${activity.id}`)}>
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                    <Avatar className="w-12 h-12 border-2 border-background">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.username || 'User'} />
                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                        {profile?.name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Activity Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-base font-semibold text-foreground">
                            You ranked {activity.name}
                          </p>
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {activity.rating ? activity.rating.toFixed(1) : '—'}
                          </div>
                        </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPinIcon className="h-4 w-4" />
                        <span className="truncate">{activity.address}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span>1 visit</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-foreground" onClick={e => {
                  e.stopPropagation();
                  navigate(`/share/restaurant/${activity.id}`);
                }}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>)}
            </div> : <div className="px-4 py-8 bg-background text-center">
              <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                No activity yet. Start rating restaurants!
              </p>
            </div>}
        </div>
      </div>

      {/* Bottom spacer for mobile safe area */}
      <div className="h-20 lg:hidden"></div>
    </div>;
}
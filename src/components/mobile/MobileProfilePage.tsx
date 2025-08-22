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
      <div className="px-2 pt-8 pb-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Profile Photo */}
          <div className="relative">
            <Avatar className="w-20 h-20 border border-border/20">
              <AvatarImage src={profile.avatar_url || ''} alt={profile.username || 'User'} />
              <AvatarFallback className="text-xl font-bold bg-muted text-muted-foreground">
                {profile.name?.charAt(0) || profile.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button size="sm" variant="outline" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border border-border/30" onClick={() => navigate('/profile/edit-photo')}>
              <Camera className="h-3 w-3" />
            </Button>
          </div>

          {/* User Info */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-muted" onClick={() => navigate('/profile/edit')}>
                <Edit2 className="h-4 w-4 stroke-[1.5]" />
              </Button>
            </div>
            
            {profile.username && profile.name && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            
            {profile.bio && <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{profile.bio}</p>}
            
            {profile.home_city && <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 stroke-[1.5]" />
                <span>{profile.home_city}</span>
              </div>}

            {/* Privacy Badge */}
            <Badge variant="outline" className="mt-3 bg-background border-border/50 text-muted-foreground">
              {profile.is_public ? "Public Profile" : "Private Profile"}
            </Badge>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-8 mt-4">
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
      <div className="px-2 space-y-6">
        {/* Top Navigation List - Data/Stats */}
        <div className="space-y-1">
          {/* Rated Restaurants */}
          <Button onClick={() => navigate('/rated')} variant="ghost" className="w-full h-auto p-4 justify-start bg-background hover:bg-muted/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-4 w-full">
              <Star className="h-5 w-5 stroke-[1.5] text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Rated Restaurants</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{stats.rated_count}</span>
                <ChevronRight className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
              </div>
            </div>
          </Button>

          {/* Want to Try */}
          <Button onClick={() => navigate('/wishlist')} variant="ghost" className="w-full h-auto p-4 justify-start bg-background hover:bg-muted/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-4 w-full">
              <Bookmark className="h-5 w-5 stroke-[1.5] text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Want to Try</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{stats.wishlist_count}</span>
                <ChevronRight className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
              </div>
            </div>
          </Button>

          {/* Itineraries */}
          <Button onClick={() => navigate('/travel?view=saved')} variant="ghost" className="w-full h-auto p-4 justify-start bg-background hover:bg-muted/50 rounded-lg border border-border/30">
            <div className="flex items-center gap-4 w-full">
              <Route className="h-5 w-5 stroke-[1.5] text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Itineraries</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{itineraries.length}</span>
                <ChevronRight className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
              </div>
            </div>
          </Button>
        </div>

        {/* Bottom Action Buttons - Settings/Actions */}
        <div className="space-y-3">
          {/* Friends */}
          <Button onClick={() => navigate('/mobile/friends')} variant="ghost" className="w-full h-auto p-4 justify-start bg-primary/5 hover:bg-primary/10 rounded-xl border-0">
            <div className="flex items-center gap-4 w-full">
              <Users className="h-5 w-5 stroke-[1.5] text-primary" />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Friends</p>
                <p className="text-sm text-muted-foreground">View and manage your friends</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{stats.following_count}</span>
                <ChevronRight className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
              </div>
            </div>
          </Button>

          {/* Trip Privacy - only show if user has itineraries */}
          {itineraries.length > 0 && (
            <Button onClick={() => navigate('/itinerary-privacy')} variant="ghost" className="w-full h-auto p-4 justify-start bg-primary/5 hover:bg-primary/10 rounded-xl border-0">
              <div className="flex items-center gap-4 w-full">
                <Route className="h-5 w-5 stroke-[1.5] text-primary" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">Trip Privacy</p>
                  <p className="text-sm text-muted-foreground">Manage itinerary sharing settings</p>
                </div>
                <ChevronRight className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
              </div>
            </Button>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-2 space-y-4 mt-8">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5 stroke-[1.5]" />
          Recent Activity
        </h3>
        
        {loadingActivity ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="w-6 h-6 bg-muted rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-4 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => navigate(`/restaurant/${activity.id}`)}>
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground flex-1 min-w-0 truncate">
                      You ranked {activity.name}
                    </p>
                    <Badge variant="default" className="bg-primary text-primary-foreground px-2 py-1 text-sm font-bold whitespace-nowrap flex-shrink-0">
                      {activity.rating ? activity.rating.toFixed(1) : '—'}
                    </Badge>
                  </div>
                  
                  {/* Details Row */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4 stroke-[1.5]" />
                    <span className="truncate">{activity.address}</span>
                    <span className="text-xs">•</span>
                    <span>1 visit</span>
                  </div>
                  
                  {/* Action Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted">
                        <Heart className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted">
                        <MessageCircle className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted" onClick={e => {
                        e.stopPropagation();
                        navigate(`/share/restaurant/${activity.id}`);
                      }}>
                        <Share2 className="h-4 w-4 stroke-[1.5] text-muted-foreground" />
                      </Button>
                    </div>
                    
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              No activity yet. Start rating restaurants!
            </p>
          </div>
        )}
      </div>

      {/* Bottom spacer for mobile safe area */}
      <div className="h-20 lg:hidden"></div>
    </div>;
}
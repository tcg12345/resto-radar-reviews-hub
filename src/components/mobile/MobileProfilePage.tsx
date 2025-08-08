import { useState, useEffect } from 'react';
import { Camera, Edit2, Users, MapPin, Crown, Star, Heart, TrendingUp, Activity, ChevronRight, Bookmark, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useItineraries } from '@/hooks/useItineraries';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ProfileStats {
  rated_count: number;
  wishlist_count: number;
  avg_rating: number;
  top_cuisine: string;
  following_count: number;
  followers_count: number;
}

export function MobileProfilePage() {
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
    followers_count: 0
  });

  // Load user stats
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase.rpc('get_user_stats', {
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


  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
            <Button
              size="sm"
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-lg"
              onClick={() => navigate('/profile/edit-photo')}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* User Info */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold">{profile.name || profile.username}</h1>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => navigate('/profile/edit')}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            
            {profile.username && profile.name && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            
            {profile.bio && (
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">{profile.bio}</p>
            )}
            
            {profile.home_city && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                <span>{profile.home_city}</span>
              </div>
            )}

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
      <div className="px-4 space-y-4">
        {/* Navigation Buttons */}
        <div className="space-y-2">
          {/* Rated Restaurants Button */}
          <Button 
            onClick={() => navigate('/rated')} 
            className="w-full h-14 bg-background hover:bg-muted/50 border border-border"
            variant="outline"
          >
            <div className="flex items-center gap-4 w-full">
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

          {/* Wishlist Button */}
          <Button 
            onClick={() => navigate('/wishlist')} 
            className="w-full h-14 bg-background hover:bg-muted/50 border border-border"
            variant="outline"
          >
            <div className="flex items-center gap-4 w-full">
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

          {/* Itineraries Button */}
          <Button 
            onClick={() => navigate('/travel?view=saved')} 
            className="w-full h-14 bg-background hover:bg-muted/50 border border-border"
            variant="outline"
          >
            <div className="flex items-center gap-4 w-full">
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
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.rated_count}</p>
                <p className="text-xs text-muted-foreground">Restaurants Rated</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.wishlist_count}</p>
                <p className="text-xs text-muted-foreground">Wishlist Items</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.avg_rating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Avg Rating</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Crown className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold truncate">{stats.top_cuisine || 'None'}</p>
                <p className="text-xs text-muted-foreground">Top Cuisine</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Friends Button */}
        <Button 
          onClick={() => navigate('/mobile/friends')} 
          className="w-full h-16 bg-primary/10 hover:bg-primary/20 border-2 border-primary/20 hover:border-primary/30 transition-all duration-200"
          variant="outline"
        >
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


        {/* Activity Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.rated_count > 0 ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span>Latest restaurant rating</span>
                    <span className="text-muted-foreground">Recently</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Wishlist updates</span>
                    <span className="text-muted-foreground">This week</span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No activity yet. Start rating restaurants!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom spacer for mobile safe area */}
      <div className="h-20 lg:hidden"></div>

      {/* Removed dialogs - now using full page navigation */}
    </div>
  );
}
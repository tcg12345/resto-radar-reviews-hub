import { useState, useEffect } from 'react';
import { Camera, Edit2, User, Users, MapPin, FileText, Settings, Crown, Star, Heart, TrendingUp, Activity, Grid, List, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProfileEditDialog } from './ProfileEditDialog';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendSearch } from '@/components/friends/FriendSearch';
import { FriendRequests } from '@/components/friends/FriendRequests';
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
  const {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers
  } = useFriends();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    rated_count: 0,
    wishlist_count: 0,
    avg_rating: 0,
    top_cuisine: '',
    following_count: 0,
    followers_count: 0
  });
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleStartChat = async (friend: any) => {
    if (!user) return;
    try {
      const { data: roomId, error } = await supabase.rpc('get_or_create_dm_room', {
        other_user_id: friend.id
      });
      if (error) {
        console.error('Error creating chat room:', error);
        toast.error('Failed to start chat');
        return;
      }
      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  const handleViewProfile = (friend: any) => {
    navigate(`/friends/${friend.id}`);
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await removeFriend(friendId);
      toast.success('Friend removed successfully');
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(friend => friend.id === userId);
  };

  const hasPendingRequest = (userId: string) => {
    return sentRequests.some(request => 
      request.receiver_id === userId || 
      (request.receiver && (request.receiver as any).id === userId)
    );
  };

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
      <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-primary-glow/10 px-4 pt-6 pb-8">
        <div className="flex flex-col items-center space-y-4">
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
              onClick={() => setIsPhotoDialogOpen(true)}
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
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            
            {profile.username && profile.name && (
              <p className="text-muted-foreground">@{profile.username}</p>
            )}
            
            {profile.home_city && (
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{profile.home_city}</span>
              </div>
            )}
            
            {profile.bio && (
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">{profile.bio}</p>
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

      {/* Content Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 gap-1 p-1 mb-6 bg-muted rounded-lg">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="friends" className="text-xs">Friends</TabsTrigger>
            <TabsTrigger value="find" className="text-xs">Find</TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
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
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">My Friends ({friends.length})</h3>
            </div>
            
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">Start building your network</p>
                <Button onClick={() => setActiveTab('find')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onViewProfile={handleViewProfile}
                    onChat={handleStartChat}
                    onRemove={handleRemoveFriend}
                    className="hover:scale-[1.01]"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Find Friends Tab */}
          <TabsContent value="find" className="space-y-4">
            <FriendSearch
              onSearchUsers={searchUsers}
              onSendFriendRequest={async (userId: string) => {
                await sendFriendRequest(userId);
              }}
              isAlreadyFriend={isAlreadyFriend}
              hasPendingRequest={hasPendingRequest}
            />
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-4">
            <FriendRequests
              pendingRequests={pendingRequests as any}
              sentRequests={sentRequests as any}
              onRespondToRequest={respondToFriendRequest}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <ProfileEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        currentProfile={profile}
      />
      
      <PhotoUploadDialog
        isOpen={isPhotoDialogOpen}
        onClose={() => setIsPhotoDialogOpen(false)}
        currentAvatarUrl={profile.avatar_url}
      />
    </div>
  );
}
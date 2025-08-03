import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Filter, Grid, List, Sparkles, Activity, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendSearch } from '@/components/friends/FriendSearch';
import { FriendRequests } from '@/components/friends/FriendRequests';
import { FriendStats } from '@/components/friends/FriendStats';
import { FriendProfilePopup } from '@/components/FriendProfilePopup';
import { FriendCardSkeleton } from '@/components/skeletons/FriendCardSkeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
interface SearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
}
interface FriendActivity {
  restaurant_id: string;
  restaurant_name: string;
  cuisine: string;
  rating: number | null;
  date_visited: string | null;
  created_at: string;
  friend_id: string;
  friend_username: string;
}
export function FriendsPage({
  initialViewFriendId,
  onInitialViewProcessed
}: {
  initialViewFriendId?: string | null;
  onInitialViewProcessed?: () => void;
} = {}) {
  const {
    user
  } = useAuth();
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
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [activeTab, setActiveTab] = useState('friends');
  const [friendsActivity, setFriendsActivity] = useState<FriendActivity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Load friends activity
  const loadFriendsActivity = async () => {
    if (!user || friends.length === 0) return;
    setIsLoadingActivity(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('get_friends_recent_activity', {
        requesting_user_id: user.id,
        activity_limit: 20
      });
      if (error) throw error;
      setFriendsActivity(data || []);
    } catch (error) {
      console.error('Error loading friends activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };
  useEffect(() => {
    if (user && friends.length > 0 && activeTab === 'activity') {
      loadFriendsActivity();
    }
  }, [user, friends, activeTab]);

  // Filter and sort friends
  const filteredFriends = friends.filter(friend => friend.username.toLowerCase().includes(filterQuery.toLowerCase()) || friend.name?.toLowerCase().includes(filterQuery.toLowerCase())).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.username.localeCompare(b.username);
      case 'activity':
        // Use a default value for activity comparison
        return 0;
      case 'score':
        // Use a default value for score comparison  
        return 0;
      default:
        return 0;
    }
  });
  const handleViewProfile = (friend: any) => {
    navigate(`/friends/${friend.id}`);
  };
  const handleStartChat = async (friend: any) => {
    if (!user) return;
    try {
      const {
        data: roomId,
        error
      } = await supabase.rpc('get_or_create_dm_room', {
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
    return sentRequests.some(request => request.receiver_id === userId || request.receiver && (request.receiver as any).id === userId);
  };
  const getRecentActivityCount = () => {
    // Calculate friends with recent activity (placeholder logic)
    return Math.floor(friends.length * 0.6); // Assume 60% have recent activity
  };
  if (isLoading) {
    return <div className="w-full max-w-none py-8 px-4 lg:px-6 space-y-8">
        <div className="text-center">
          <div className="animate-pulse bg-muted h-8 w-48 mx-auto rounded mb-4"></div>
          <div className="animate-pulse bg-muted h-4 w-64 mx-auto rounded"></div>
        </div>
        <FriendStats totalFriends={0} pendingRequests={0} sentRequests={0} recentActivity={0} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({
          length: 6
        }).map((_, i) => <FriendCardSkeleton key={i} />)}
        </div>
      </div>;
  }
  return <div className="w-full max-w-none py-8 px-4 lg:px-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        
      </div>

      {/* Stats Overview */}
      <FriendStats totalFriends={friends.length} pendingRequests={pendingRequests.length} sentRequests={sentRequests.length} recentActivity={getRecentActivityCount()} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto p-0 flex overflow-x-auto gap-1 mb-8 bg-muted rounded-md">
          <TabsTrigger value="friends" className="flex items-center gap-1 text-xs whitespace-nowrap px-3 py-2 flex-shrink-0 ml-1">
            <Users className="h-3 w-3" />
            <span>Friends ({friends.length})</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-1 text-xs whitespace-nowrap px-3 py-2 flex-shrink-0">
            <Activity className="h-3 w-3" />
            <span>Activity</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-1 text-xs whitespace-nowrap px-3 py-2 flex-shrink-0">
            <Plus className="h-3 w-3" />
            <span>Find Friends</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1 text-xs whitespace-nowrap px-3 py-2 flex-shrink-0 mr-1">
            <Filter className="h-3 w-3" />
            <span>Requests ({pendingRequests.length + sentRequests.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-6">
          {friends.length === 0 ? <div className="text-center py-16">
              <div className="p-6 rounded-full bg-muted/50 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No friends yet</h3>
              <p className="text-muted-foreground mb-6 w-full max-w-none">
                Start building your network by searching for friends and sending connection requests
              </p>
              <Button onClick={() => setActiveTab('search')} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Find Friends
              </Button>
            </div> : <>
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Input placeholder="Search friends..." value={filterQuery} onChange={e => setFilterQuery(e.target.value)} className="w-full max-w-none lg:max-w-xs" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="score">Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant={viewMode === 'grid' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grid')}>
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button variant={viewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Friends Grid/List */}
              <div className={cn("grid gap-6", viewMode === 'grid' ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1 w-full max-w-none")}>
                {filteredFriends.map(friend => <FriendCard key={friend.id} friend={friend} onViewProfile={handleViewProfile} onChat={handleStartChat} onRemove={handleRemoveFriend} className={viewMode === 'list' ? 'hover:scale-[1.01]' : ''} />)}
              </div>

              {filteredFriends.length === 0 && filterQuery && <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No friends found matching "{filterQuery}"
                  </p>
                </div>}
            </>}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Recent Activity</h2>
              <p className="text-muted-foreground">See what your friends have been eating</p>
            </div>
            <Button onClick={loadFriendsActivity} variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {isLoadingActivity ? <div className="grid gap-4">
              {Array.from({
            length: 6
          }).map((_, i) => <Card key={i} className="p-4">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </Card>)}
            </div> : friendsActivity.length === 0 ? <div className="text-center py-16">
              <div className="p-6 rounded-full bg-muted/50 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Activity className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No recent activity</h3>
              <p className="text-muted-foreground mb-6">
                Your friends haven't shared any restaurant experiences recently
              </p>
            </div> : <div className="grid gap-4">
              {friendsActivity.map(activity => <Card key={activity.restaurant_id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{activity.friend_username}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {activity.date_visited ? `Visited ${new Date(activity.date_visited).toLocaleDateString()}` : `Added ${new Date(activity.created_at).toLocaleDateString()}`}
                        </span>
                      </div>
                      <h4 className="font-semibold text-lg">{activity.restaurant_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{activity.cuisine}</span>
                        {activity.rating && <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              ⭐ {activity.rating}/10
                            </span>
                          </>}
                      </div>
                    </div>
                  </div>
                </Card>)}
            </div>}
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <FriendSearch onSearchUsers={searchUsers} onSendFriendRequest={async (userId: string) => {
          await sendFriendRequest(userId);
        }} isAlreadyFriend={isAlreadyFriend} hasPendingRequest={hasPendingRequest} />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <FriendRequests pendingRequests={pendingRequests as any} sentRequests={sentRequests as any} onRespondToRequest={respondToFriendRequest} />
        </TabsContent>
      </Tabs>

      {/* Friend Profile Popup */}
      <FriendProfilePopup friend={selectedFriend} isOpen={!!selectedFriend} onClose={() => setSelectedFriend(null)} onViewProfile={handleViewProfile} />
    </div>;
}
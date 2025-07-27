import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Filter, Grid, List, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendSearch } from '@/components/friends/FriendSearch';
import { FriendRequests } from '@/components/friends/FriendRequests';
import { FriendStats } from '@/components/friends/FriendStats';
import { FriendProfilePopup } from '@/components/FriendProfilePopup';
import { FriendCardSkeleton } from '@/components/skeletons/FriendCardSkeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

export function FriendsPage({
  initialViewFriendId, 
  onInitialViewProcessed 
}: { 
  initialViewFriendId?: string | null; 
  onInitialViewProcessed?: () => void; 
} = {}) {
  const { user } = useAuth();
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

  // Filter and sort friends
  const filteredFriends = friends
    .filter(friend => 
      friend.username.toLowerCase().includes(filterQuery.toLowerCase()) ||
      friend.name?.toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => {
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
    setSelectedFriend(friend);
  };

  const handleStartChat = (friend: any) => {
    navigate(`/chat/${friend.id}`);
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

  const getRecentActivityCount = () => {
    // Calculate friends with recent activity (placeholder logic)
    return Math.floor(friends.length * 0.6); // Assume 60% have recent activity
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-8">
        <div className="text-center">
          <div className="animate-pulse bg-muted h-8 w-48 mx-auto rounded mb-4"></div>
          <div className="animate-pulse bg-muted h-4 w-64 mx-auto rounded"></div>
        </div>
        <FriendStats 
          totalFriends={0} 
          pendingRequests={0} 
          sentRequests={0} 
          recentActivity={0}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FriendCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Friends Network
            </h1>
            <p className="text-muted-foreground mt-2">
              Connect, share, and discover amazing places together
            </p>
          </div>
          <div className="p-3 rounded-full bg-gradient-to-r from-secondary/20 to-primary/20">
            <Sparkles className="h-8 w-8 text-secondary" />
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <FriendStats 
        totalFriends={friends.length}
        pendingRequests={pendingRequests.length}
        sentRequests={sentRequests.length}
        recentActivity={getRecentActivityCount()}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            My Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Find Friends
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Requests ({pendingRequests.length + sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-6">
          {friends.length === 0 ? (
            <div className="text-center py-16">
              <div className="p-6 rounded-full bg-muted/50 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No friends yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start building your network by searching for friends and sending connection requests
              </p>
              <Button onClick={() => setActiveTab('search')} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Find Friends
              </Button>
            </div>
          ) : (
            <>
              {/* Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Input
                    placeholder="Search friends..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    className="max-w-xs"
                  />
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
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Friends Grid/List */}
              <div className={cn(
                "grid gap-6",
                viewMode === 'grid' 
                  ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1 max-w-2xl mx-auto"
              )}>
                {filteredFriends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    friend={friend}
                    onViewProfile={handleViewProfile}
                    onChat={handleStartChat}
                    onRemove={handleRemoveFriend}
                    className={viewMode === 'list' ? 'hover:scale-[1.01]' : ''}
                  />
                ))}
              </div>

              {filteredFriends.length === 0 && filterQuery && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No friends found matching "{filterQuery}"
                  </p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <FriendSearch
            onSearchUsers={searchUsers}
            onSendFriendRequest={async (userId: string) => {
              await sendFriendRequest(userId);
            }}
            isAlreadyFriend={isAlreadyFriend}
            hasPendingRequest={hasPendingRequest}
          />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <FriendRequests
            pendingRequests={pendingRequests as any}
            sentRequests={sentRequests as any}
            onRespondToRequest={respondToFriendRequest}
          />
        </TabsContent>
      </Tabs>

      {/* Friend Profile Popup */}
      <FriendProfilePopup 
        friend={selectedFriend}
        isOpen={!!selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onViewProfile={handleViewProfile}
      />
    </div>
  );
}
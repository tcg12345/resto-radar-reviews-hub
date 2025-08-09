import { useState } from 'react';
import { ArrowLeft, Users, Plus, UserPlus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { FriendCard } from '@/components/friends/FriendCard';
import { FriendSearch } from '@/components/friends/FriendSearch';
import { FriendRequests } from '@/components/friends/FriendRequests';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function MobileFriendsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const [activeTab, setActiveTab] = useState('friends');

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

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background"></div>
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/profile')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Friends</h1>
            <p className="text-sm text-muted-foreground">{friends.length} friends</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 gap-1 p-1 mb-6 bg-muted rounded-lg">
            <TabsTrigger value="friends" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="find" className="text-xs">
              <Plus className="h-4 w-4 mr-1" />
              Find
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">
              <Clock className="h-4 w-4 mr-1" />
              Requests
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-4">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No friends yet</h3>
                <p className="text-muted-foreground mb-4">Start building your network</p>
                <Button onClick={() => setActiveTab('find')}>
                  <UserPlus className="h-4 w-4 mr-2" />
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
                    className="hover:scale-[1.01] transition-transform"
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
    </div>
  );
}
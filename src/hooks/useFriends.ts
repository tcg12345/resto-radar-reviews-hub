import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Friend {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  score: number;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  sender?: {
    username: string;
    name: string | null;
    avatar_url: string | null;
  };
  receiver?: {
    username: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      // Use the new super-fast function with explicit column references
      const { data: friendsData, error } = await supabase
        .rpc('get_friends_with_scores', { 
          requesting_user_id: user.id 
        });

      if (error) throw error;

      // Map the data to our expected format
      const mappedFriends: Friend[] = (friendsData || []).map((friend: any) => ({
        id: friend.friend_id,
        username: friend.username || '',
        name: friend.name,
        avatar_url: friend.avatar_url,
        is_public: friend.is_public || false,
        score: friend.score || 0
      }));

      setFriends(mappedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const fetchFriendRequests = async () => {
    if (!user) return;

    try {
      // Pending requests received
      const { data: received, error: receivedError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_id_fkey(username, name, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (receivedError) throw receivedError;

      // Sent requests pending
      const { data: sent, error: sentError } = await supabase
        .from('friend_requests')
        .select(`
          *,
          receiver:profiles!friend_requests_receiver_id_fkey(username, name, avatar_url)
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending');

      if (sentError) throw sentError;

      setPendingRequests((received || []) as FriendRequest[]);
      setSentRequests((sent || []) as FriendRequest[]);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast.error('Failed to load friend requests');
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId
        });

      if (error) throw error;

      toast.success('Friend request sent!');
      fetchFriendRequests();
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
      return false;
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        const { error } = await supabase.rpc('accept_friend_request', { request_id: requestId });
        if (error) throw error;
        toast.success('Friend request accepted!');
        fetchFriends();
      } else {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'declined' })
          .eq('id', requestId);
        if (error) throw error;
        toast.success('Friend request declined');
      }
      
      fetchFriendRequests();
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request');
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`);

      if (error) throw error;

      toast.success('Friend removed');
      fetchFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  const searchUsers = async (query: string) => {
    if (!user || query.length < 2) return [];

    // Input validation and sanitization
    const sanitizedQuery = query
      .trim()
      .replace(/[<>'"]/g, '') // Remove potential XSS characters
      .substring(0, 50); // Limit length

    if (sanitizedQuery.length < 2) return [];

    // Prevent SQL injection by using parameterized queries
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url, is_public')
        .or(`username.ilike.%${sanitizedQuery}%,name.ilike.%${sanitizedQuery}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  };

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      return;
    }

    setIsLoading(true);
    
    // Load initial data
    Promise.all([fetchFriends(), fetchFriendRequests()]).finally(() => {
      setIsLoading(false);
    });

    // Set up real-time subscriptions for friend requests only (not friends, as that table doesn't change often)
    const friendRequestsChannel = supabase
      .channel('friend-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `or(receiver_id.eq.${user.id},sender_id.eq.${user.id})`
        },
        (payload) => {
          console.log('Friend request change:', payload);
          // Refresh friend requests when they change
          fetchFriendRequests();
          
          // If a request was accepted, refresh friends list too
          if (payload.eventType === 'UPDATE' && 
              payload.new && 
              (payload.new as any).status === 'accepted') {
            fetchFriends();
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for friends table
    const friendsChannel = supabase
      .channel('friends-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `or(user1_id.eq.${user.id},user2_id.eq.${user.id})`
        },
        (payload) => {
          console.log('Friends change:', payload);
          fetchFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendRequestsChannel);
      supabase.removeChannel(friendsChannel);
    };
  }, [user]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers,
    refreshData: () => {
      fetchFriends();
      fetchFriendRequests();
    }
  };
}
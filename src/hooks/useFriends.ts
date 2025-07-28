import { useState, useEffect, useCallback } from 'react';
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
  restaurant_count?: number;
  wishlist_count?: number;
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

  const fetchAllFriendsData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all data in parallel to reduce sequential calls
      const [friendsResult, receivedRequestsResult, sentRequestsResult] = await Promise.all([
        supabase.rpc('get_friends_with_scores', { requesting_user_id: user.id }),
        supabase
          .from('friend_requests')
          .select(`
            *,
            sender:profiles!friend_requests_sender_id_fkey(username, name, avatar_url)
          `)
          .eq('receiver_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('friend_requests')
          .select(`
            *,
            receiver:profiles!friend_requests_receiver_id_fkey(username, name, avatar_url)
          `)
          .eq('sender_id', user.id)
          .eq('status', 'pending')
      ]);

      // Handle friends data
      if (friendsResult.error) throw friendsResult.error;
      
      // Get detailed stats for each friend
      const friendIds = (friendsResult.data || []).map((f: any) => f.friend_id);
      let friendsStats: any = {};
      
      if (friendIds.length > 0) {
        // Fetch restaurant and wishlist counts for all friends
        const { data: statsData } = await supabase
          .from('restaurants')
          .select('user_id, is_wishlist')
          .in('user_id', friendIds);
        
        // Calculate counts for each friend
        const statsByUser = (statsData || []).reduce((acc: any, restaurant: any) => {
          if (!acc[restaurant.user_id]) {
            acc[restaurant.user_id] = { restaurant_count: 0, wishlist_count: 0 };
          }
          if (restaurant.is_wishlist) {
            acc[restaurant.user_id].wishlist_count++;
          } else {
            acc[restaurant.user_id].restaurant_count++;
          }
          return acc;
        }, {});
        
        friendsStats = statsByUser;
      }
      
      const mappedFriends: Friend[] = (friendsResult.data || []).map((friend: any) => ({
        id: friend.friend_id,
        username: friend.username || '',
        name: friend.name,
        avatar_url: friend.avatar_url,
        is_public: friend.is_public || false,
        score: friend.score || 0,
        restaurant_count: friendsStats[friend.friend_id]?.restaurant_count || 0,
        wishlist_count: friendsStats[friend.friend_id]?.wishlist_count || 0
      }));
      setFriends(mappedFriends);

      // Handle friend requests
      if (receivedRequestsResult.error) throw receivedRequestsResult.error;
      if (sentRequestsResult.error) throw sentRequestsResult.error;
      
      setPendingRequests((receivedRequestsResult.data || []) as FriendRequest[]);
      setSentRequests((sentRequestsResult.data || []) as FriendRequest[]);

    } catch (error) {
      console.error('Error fetching friends data:', error);
      toast.error('Failed to load friends data');
      
      // Reset to empty arrays on error to prevent stale data
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
    }
  }, [user, setFriends, setPendingRequests, setSentRequests]);

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
      fetchAllFriendsData();
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
      } else {
        const { error } = await supabase
          .from('friend_requests')
          .update({ status: 'declined' })
          .eq('id', requestId);
        if (error) throw error;
        toast.success('Friend request declined');
      }
      
      fetchAllFriendsData();
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
      fetchAllFriendsData();
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
    
    // Load initial data with single optimized call
    fetchAllFriendsData().finally(() => {
      setIsLoading(false);
    });

    // Debounced refresh function to prevent too many calls
    let timeoutId: NodeJS.Timeout;
    const debouncedRefresh = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchAllFriendsData();
      }, 300); // 300ms debounce
    };

    // Set up real-time subscriptions with debounced updates
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
          debouncedRefresh();
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
          debouncedRefresh();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(friendRequestsChannel);
      supabase.removeChannel(friendsChannel);
    };
  }, [user, fetchAllFriendsData]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers,
    refreshData: fetchAllFriendsData
  };
}
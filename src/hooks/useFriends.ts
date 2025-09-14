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
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);

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
      if (friendsResult.error) {
        console.error('Friends RPC error:', friendsResult.error);
        throw friendsResult.error;
      }
      
      // Build mapped friends without heavy per-friend stats for instant load
      const cacheKey = user ? `friends:list:${user.id}` : 'friends:list';
      const mappedFriends: Friend[] = (friendsResult.data || []).map((friend: any) => ({
        id: friend.friend_id,
        username: friend.username || '',
        name: friend.name,
        avatar_url: friend.avatar_url,
        is_public: friend.is_public || false,
        score: friend.score || 0,
      }));
      setFriends(mappedFriends);
      try { localStorage.setItem(cacheKey, JSON.stringify(mappedFriends)); } catch {}

      // Handle friend requests
      if (receivedRequestsResult.error) {
        console.error('Received requests error:', receivedRequestsResult.error);
        throw receivedRequestsResult.error;
      }
      if (sentRequestsResult.error) {
        console.error('Sent requests error:', sentRequestsResult.error);
        throw sentRequestsResult.error;
      }
      
      setPendingRequests((receivedRequestsResult.data || []) as FriendRequest[]);
      setSentRequests((sentRequestsResult.data || []) as FriendRequest[]);

    } catch (error) {
      console.error('Error fetching friends data:', error);
      // Only show toast for network/server errors, not auth errors
      if (error && typeof error === 'object' && 'message' in error) {
        if (!error.message.includes('JWT') && !error.message.includes('unauthorized')) {
          toast.error('Failed to load friends data');
        }
      }
      
      // Reset to empty arrays on error to prevent stale data
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setHasError(true);
      setRetryCount(prev => prev + 1);
    }
  }, [user]);

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

    // Use the new secure function that only exposes safe fields
    try {
      const { data, error } = await supabase.rpc('get_discoverable_profiles', {
        search_query: sanitizedQuery,
        limit_count: 10
      });

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
      setHasError(false);
      setRetryCount(0);
      setIsLoading(false);
      return;
    }

    // Prevent infinite retries - max 2 attempts only
    if (retryCount >= 2) {
      console.warn('Max retries reached for friends data, stopping attempts');
      setIsLoading(false);
      setHasError(true);
      return;
    }

    // Load from cache immediately
    const cacheKey = `friends:list:${user.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Friend[];
        if (Array.isArray(parsed)) {
          setFriends(parsed);
        }
      }
    } catch {}
    
    setIsLoading(true);
    setHasError(false);
    
    // Single fetch attempt with no automatic retries
    fetchAllFriendsData().finally(() => {
      setIsLoading(false);
    });

    // Only set up realtime if no previous errors
    if (retryCount > 0) {
      return;
    }

    // Throttled refresh to prevent spam
    let lastRefresh = 0;
    const throttledRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh > 2000) { // 2 second throttle
        lastRefresh = now;
        fetchAllFriendsData();
      }
    };

    // Single realtime channel for both tables
    const channel = supabase
      .channel('friends-and-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `or(receiver_id.eq.${user.id},sender_id.eq.${user.id})`
        },
        throttledRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `or(user1_id.eq.${user.id},user2_id.eq.${user.id})`
        },
        throttledRefresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAllFriendsData]);

  const resetRetries = () => {
    setRetryCount(0);
    setHasError(false);
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    hasError,
    retryCount,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers,
    refreshData: fetchAllFriendsData,
    resetRetries
  };
}
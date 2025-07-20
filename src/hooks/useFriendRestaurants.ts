import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Restaurant } from '@/types/restaurant';

export function useFriendRestaurants() {
  const { user } = useAuth();
  const [friendRestaurants, setFriendRestaurants] = useState<(Restaurant & { friend_username: string })[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriendRestaurants = async (friendId: string, includeWishlist: boolean = false, limit?: number) => {
    if (!user) return [];

    try {
      setIsLoading(true);
      
      // Check if user is friends with this person or if they have a public account
      const { data: friendData, error: friendError } = await supabase
        .from('profiles')
        .select('is_public, username')
        .eq('id', friendId)
        .single();

      if (friendError) throw friendError;

      let canView = friendData.is_public;

      if (!canView) {
        // Check if they're friends
        const { data: friendship, error: friendshipError } = await supabase
          .from('friends')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`)
          .single();

        canView = !friendshipError && !!friendship;
      }

      if (!canView) {
        toast.error('This user has a private account. You need to be friends to view their restaurants.');
        return [];
      }

      const query = supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', friendId);

      if (!includeWishlist) {
        query.eq('is_wishlist', false);
      }

      let finalQuery = query.order('created_at', { ascending: false });
      
      if (limit) {
        finalQuery = finalQuery.limit(limit);
      }
      
      const { data, error } = await finalQuery;

      if (error) throw error;

      return (data || []).map(restaurant => ({
        ...restaurant,
        friend_username: friendData.username || 'Unknown User'
      }));
    } catch (error) {
      console.error('Error fetching friend restaurants:', error);
      toast.error('Failed to load friend restaurants');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized function using new combined RPC for instant stats
  const fetchFriendStats = async (friendId: string) => {
    if (!user?.id) {
      console.log('No authenticated user');
      return null;
    }

    try {
      // Use the new optimized combined function for instant profile data
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_friend_profile_data', { 
          target_user_id: friendId,
          requesting_user_id: user.id,
          restaurant_limit: 0 // We only want stats, not restaurants
        })
        .single();

      if (profileError || !profileData) {
        console.error('Error fetching friend profile data:', profileError);
        return null;
      }

      if (!profileData.can_view) {
        console.log('User cannot view friend data');
        return null;
      }
      
      return {
        ratedCount: profileData.rated_count || 0,
        wishlistCount: profileData.wishlist_count || 0,
        averageRating: parseFloat(String(profileData.avg_rating)) || 0,
        topCuisine: profileData.top_cuisine || '',
        username: profileData.username || 'Unknown User'
      };
    } catch (error) {
      console.error('Error fetching friend stats:', error);
      return null;
    }
  };

  const fetchAllFriendsRestaurants = async (page: number = 0, pageSize: number = 20) => {
    if (!user?.id) {
      console.log('No authenticated user');
      return { activities: [], hasMore: false };
    }

    setIsLoading(true);
    try {
      // Use the new cached edge function for ultra-fast loading
      const { data: result, error } = await supabase.functions.invoke('friend-activity-cache', {
        body: {
          action: 'get_activity',
          page,
          page_size: pageSize
        }
      });

      if (error) {
        console.error('Error fetching cached friend activity:', error);
        setFriendRestaurants([]);
        return { activities: [], hasMore: false };
      }

      const activities = result.activities?.map((activity: any) => ({
        ...activity.activity_data,
        activity_date: activity.activity_date
      })) || [];

      if (page === 0) {
        // First page - replace existing data
        setFriendRestaurants(activities);
      } else {
        // Subsequent pages - append to existing data
        setFriendRestaurants(prev => [...prev, ...activities]);
      }

      console.log(`Loaded ${activities.length} activities from cache (page ${page})`);
      return { 
        activities, 
        hasMore: result.has_more || false,
        cacheStatus: result.cache_status 
      };
    } catch (error) {
      console.error('Error fetching cached friend activity:', error);
      setFriendRestaurants([]);
      return { activities: [], hasMore: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Function to rebuild cache manually
  const rebuildFriendActivityCache = async () => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase.functions.invoke('friend-activity-cache', {
        body: { action: 'rebuild_cache' }
      });

      if (error) {
        console.error('Error rebuilding cache:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error rebuilding cache:', error);
      return false;
    }
  };

  return {
    friendRestaurants,
    isLoading,
    fetchFriendRestaurants,
    fetchFriendStats,
    fetchAllFriendsRestaurants,
    rebuildFriendActivityCache
  };
}
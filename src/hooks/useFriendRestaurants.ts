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

  // Optimized function using SQL aggregations for instant stats
  const fetchFriendStats = async (friendId: string) => {
    if (!user) return null;

    try {
      // Check access permission first
      const { data: friendData, error: friendError } = await supabase
        .from('profiles')
        .select('is_public, username')
        .eq('id', friendId)
        .single();

      if (friendError) throw friendError;

      let canView = friendData.is_public;

      if (!canView) {
        const { data: friendship, error: friendshipError } = await supabase
          .from('friends')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user.id})`)
          .single();

        canView = !friendshipError && !!friendship;
      }

      if (!canView) {
        return null;
      }

      // Use the new optimized database function for instant stats
      const { data: aggregatedStats, error: statsError } = await supabase
        .rpc('get_user_stats', { target_user_id: friendId });

      if (statsError) {
        console.error('Stats RPC error:', statsError);
        // Fallback to basic counts if RPC fails
        const [ratedCount, wishlistCount] = await Promise.all([
          supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', friendId)
            .eq('is_wishlist', false)
            .not('rating', 'is', null),
          supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', friendId)
            .eq('is_wishlist', true)
        ]);

        return {
          ratedCount: ratedCount.count || 0,
          wishlistCount: wishlistCount.count || 0,
          averageRating: 0,
          topCuisine: '',
          username: friendData.username || 'Unknown User'
        };
      }

      const stats = aggregatedStats?.[0] || {
        rated_count: 0,
        wishlist_count: 0,
        avg_rating: 0,
        top_cuisine: ''
      };
      
      return {
        ratedCount: stats.rated_count || 0,
        wishlistCount: stats.wishlist_count || 0,
        averageRating: parseFloat(String(stats.avg_rating)) || 0,
        topCuisine: stats.top_cuisine || '',
        username: friendData.username || 'Unknown User'
      };
    } catch (error) {
      console.error('Error fetching friend stats:', error);
      return null;
    }
  };

  const fetchAllFriendsRestaurants = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Get all friends
      const { data: friendships, error: friendError } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (friendError) throw friendError;

      const friendIds = friendships?.map(friendship => 
        friendship.user1_id === user.id ? friendship.user2_id : friendship.user1_id
      ) || [];

      if (friendIds.length === 0) {
        setFriendRestaurants([]);
        return;
      }

      // Get all public friends and their restaurants - limit to 20 for performance
      const { data: publicFriends, error: publicError } = await supabase
        .from('profiles')
        .select('id, username, is_public')
        .in('id', friendIds);

      if (publicError) throw publicError;

      // Get restaurants from all friends - limit to 20 for performance
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .in('user_id', friendIds)
        .eq('is_wishlist', false)
        .not('rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

      if (restaurantError) throw restaurantError;

      const restaurantsWithFriends = (restaurants || []).map(restaurant => {
        const friend = publicFriends?.find(f => f.id === restaurant.user_id);
        return {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          city: restaurant.city,
          country: restaurant.country,
          cuisine: restaurant.cuisine,
          rating: restaurant.rating,
          reviewCount: 0,
          priceRange: restaurant.price_range,
          michelinStars: restaurant.michelin_stars,
          photos: restaurant.photos || [],
          notes: restaurant.notes,
          dateVisited: restaurant.date_visited,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          isWishlist: restaurant.is_wishlist,
          createdAt: restaurant.created_at || new Date().toISOString(),
          updatedAt: restaurant.updated_at || new Date().toISOString(),
          userId: restaurant.user_id,
          friend_username: friend?.username || 'Unknown User'
        };
      });

      setFriendRestaurants(restaurantsWithFriends);
    } catch (error) {
      console.error('Error fetching all friend restaurants:', error);
      toast.error('Failed to load friend restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    friendRestaurants,
    isLoading,
    fetchFriendRestaurants,
    fetchFriendStats,
    fetchAllFriendsRestaurants
  };
}
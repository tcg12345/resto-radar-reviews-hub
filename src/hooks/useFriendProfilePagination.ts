import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FriendProfileData {
  can_view: boolean;
  username: string;
  name: string;
  avatar_url: string;
  is_public: boolean;
  rated_count: number;
  wishlist_count: number;
  avg_rating: number;
  top_cuisine: string;
  michelin_count: number;
  restaurants: any[];
  wishlist: any[];
  has_more_restaurants: boolean;
  has_more_wishlist: boolean;
}

export function useFriendProfilePagination(targetUserId: string) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<FriendProfileData | null>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(false);
  const [hasMoreWishlist, setHasMoreWishlist] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurantOffset, setRestaurantOffset] = useState(0);
  const [wishlistOffset, setWishlistOffset] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const loadInitialData = useCallback(async () => {
    if (!user || !targetUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase.rpc('get_friend_profile_with_pagination', {
        target_user_id: targetUserId,
        requesting_user_id: user.id,
        restaurant_limit: ITEMS_PER_PAGE,
        restaurant_offset: 0,
        wishlist_limit: ITEMS_PER_PAGE,
        wishlist_offset: 0
      });

      if (profileError) {
        console.error('Error loading friend profile:', profileError);
        setError(profileError.message);
        return;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        const profileWithArrays = {
          ...profile,
          restaurants: Array.isArray(profile.restaurants) ? profile.restaurants : [],
          wishlist: Array.isArray(profile.wishlist) ? profile.wishlist : []
        };
        setProfileData(profileWithArrays);
        setRestaurants(profileWithArrays.restaurants);
        setWishlist(profileWithArrays.wishlist);
        setHasMoreRestaurants(profile.has_more_restaurants);
        setHasMoreWishlist(profile.has_more_wishlist);
        setRestaurantOffset(ITEMS_PER_PAGE);
        setWishlistOffset(ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error loading friend profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user]);

  const loadMoreRestaurants = useCallback(async () => {
    if (!user || !targetUserId || !hasMoreRestaurants || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const { data, error: loadError } = await supabase.rpc('get_friend_profile_with_pagination', {
        target_user_id: targetUserId,
        requesting_user_id: user.id,
        restaurant_limit: ITEMS_PER_PAGE,
        restaurant_offset: restaurantOffset,
        wishlist_limit: 0, // Don't load wishlist items
        wishlist_offset: 0
      });

      if (loadError) {
        console.error('Error loading more restaurants:', loadError);
        return;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        const newRestaurants = Array.isArray(profile.restaurants) ? profile.restaurants : [];
        setRestaurants(prev => [...prev, ...newRestaurants]);
        setHasMoreRestaurants(profile.has_more_restaurants);
        setRestaurantOffset(prev => prev + ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error loading more restaurants:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [targetUserId, user, restaurantOffset, hasMoreRestaurants, isLoadingMore]);

  const loadMoreWishlist = useCallback(async () => {
    if (!user || !targetUserId || !hasMoreWishlist || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const { data, error: loadError } = await supabase.rpc('get_friend_profile_with_pagination', {
        target_user_id: targetUserId,
        requesting_user_id: user.id,
        restaurant_limit: 0, // Don't load restaurant items
        restaurant_offset: 0,
        wishlist_limit: ITEMS_PER_PAGE,
        wishlist_offset: wishlistOffset
      });

      if (loadError) {
        console.error('Error loading more wishlist:', loadError);
        return;
      }

      if (data && data.length > 0) {
        const profile = data[0];
        const newWishlist = Array.isArray(profile.wishlist) ? profile.wishlist : [];
        setWishlist(prev => [...prev, ...newWishlist]);
        setHasMoreWishlist(profile.has_more_wishlist);
        setWishlistOffset(prev => prev + ITEMS_PER_PAGE);
      }
    } catch (err) {
      console.error('Error loading more wishlist:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [targetUserId, user, wishlistOffset, hasMoreWishlist, isLoadingMore]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    profileData,
    restaurants,
    wishlist,
    isLoading,
    isLoadingMore,
    hasMoreRestaurants,
    hasMoreWishlist,
    error,
    loadMoreRestaurants,
    loadMoreWishlist,
    refresh: loadInitialData
  };
}
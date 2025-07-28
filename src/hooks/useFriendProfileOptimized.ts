import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface FriendProfileOptimizedData {
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
  all_restaurants: any[];
  all_wishlist: any[];
  rating_distribution: any;
  cuisine_distribution: any[];
  cities_distribution: any[];
}

export function useFriendProfileOptimized(targetUserId: string) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<FriendProfileOptimizedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!user || !targetUserId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: profileError } = await supabase.rpc('get_friend_profile_with_all_data', {
        target_user_id: targetUserId,
        requesting_user_id: user.id
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
          all_restaurants: Array.isArray(profile.all_restaurants) ? profile.all_restaurants : [],
          all_wishlist: Array.isArray(profile.all_wishlist) ? profile.all_wishlist : [],
          rating_distribution: profile.rating_distribution || {},
          cuisine_distribution: Array.isArray(profile.cuisine_distribution) ? profile.cuisine_distribution : [],
          cities_distribution: Array.isArray(profile.cities_distribution) ? profile.cities_distribution : []
        };
        
        setProfileData(profileWithArrays);
      }
    } catch (err) {
      console.error('Error loading friend profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Memoized computed values for analytics
  const computedAnalytics = profileData ? {
    topCuisines: profileData.cuisine_distribution.slice(0, 10),
    ratingDistribution: profileData.rating_distribution,
    geographicSpread: profileData.cities_distribution,
    totalCities: profileData.cities_distribution.length,
    highRatedCount: profileData.all_restaurants.filter(r => r.rating >= 4).length,
  } : null;

  return {
    profileData,
    computedAnalytics,
    isLoading,
    error,
    refresh: loadProfileData,
    // For backwards compatibility with existing pagination components
    restaurants: profileData?.all_restaurants || [],
    wishlist: profileData?.all_wishlist || [],
  };
}
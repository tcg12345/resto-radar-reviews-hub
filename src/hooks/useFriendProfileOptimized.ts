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

  const cacheKey = `friendProfile:${targetUserId}`;

  const normalizeProfile = (raw: any): FriendProfileOptimizedData | null => {
    if (!raw) return null;

    // Shape 1: direct RPC array result
    if (Array.isArray(raw) && raw.length > 0) {
      const p = raw[0];
      return {
        ...p,
        all_restaurants: Array.isArray(p.all_restaurants) ? p.all_restaurants : [],
        all_wishlist: Array.isArray(p.all_wishlist) ? p.all_wishlist : [],
        rating_distribution: p.rating_distribution || {},
        cuisine_distribution: Array.isArray(p.cuisine_distribution) ? p.cuisine_distribution : [],
        cities_distribution: Array.isArray(p.cities_distribution) ? p.cities_distribution : [],
      } as FriendProfileOptimizedData;
    }

    // Shape 2: cached profile object from edge function
    const profile = raw.profile || raw; // sometimes wrapped
    const base = profile.profile || profile; // nested profile details
    const stats = profile.stats || raw.stats || {};
    const analytics = profile.analytics || raw.analytics || {};

    const restaurants = profile.all_restaurants || profile.restaurants || profile.rated_restaurants || [];
    const wishlist = profile.all_wishlist || profile.wishlist || [];

    const result: FriendProfileOptimizedData = {
      can_view: base.can_view ?? true,
      username: base.username ?? '',
      name: base.name ?? '',
      avatar_url: base.avatar_url ?? '',
      is_public: base.is_public ?? false,
      rated_count: stats.total_rated ?? base.rated_count ?? (Array.isArray(restaurants) ? restaurants.length : 0),
      wishlist_count: stats.total_wishlist ?? base.wishlist_count ?? (Array.isArray(wishlist) ? wishlist.length : 0),
      avg_rating: parseFloat(stats.avg_rating ?? base.avg_rating ?? 0) || 0,
      top_cuisine: stats.top_cuisine ?? base.top_cuisine ?? '',
      michelin_count: stats.michelin_count ?? base.michelin_count ?? 0,
      all_restaurants: Array.isArray(restaurants) ? restaurants : [],
      all_wishlist: Array.isArray(wishlist) ? wishlist : [],
      rating_distribution: analytics.rating_distribution ?? base.rating_distribution ?? {},
      cuisine_distribution: Array.isArray(analytics.cuisine_distribution) ? analytics.cuisine_distribution : (Array.isArray(base.cuisine_distribution) ? base.cuisine_distribution : []),
      cities_distribution: Array.isArray(analytics.cities_distribution) ? analytics.cities_distribution : (Array.isArray(base.cities_distribution) ? base.cities_distribution : []),
    };

    return result;
  };

  const loadProfileData = useCallback(async () => {
    if (!user || !targetUserId) return;

    setIsLoading(true);
    setError(null);

    // 1) Instant local cache hydrate if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FriendProfileOptimizedData;
        setProfileData(parsed);
        setIsLoading(false);
      }
    } catch (e) {
      // ignore cache errors
    }

    // 2) Fire fast stats request for instant header if no local cache
    let showedStats = false;
    if (!profileData) {
      try {
        const { data: statsRes } = await supabase.functions.invoke('friend-profile-cache', {
          body: { action: 'get_profile_stats', user_id: targetUserId },
        });
        if (statsRes?.stats) {
          const s = statsRes.stats as any;
          const partial: FriendProfileOptimizedData = {
            can_view: true,
            username: s.username || '',
            name: '',
            avatar_url: '',
            is_public: true,
            rated_count: s.ratedCount || 0,
            wishlist_count: s.wishlistCount || 0,
            avg_rating: s.averageRating || 0,
            top_cuisine: s.topCuisine || '',
            michelin_count: 0,
            all_restaurants: [],
            all_wishlist: [],
            rating_distribution: {},
            cuisine_distribution: [],
            cities_distribution: [],
          };
          setProfileData(partial);
          setIsLoading(false);
          showedStats = true;
        }
      } catch (e) {
        // ignore stats errors
      }
    }

    try {
      // 3) Try cached full profile via edge function
      const { data: edgeRes } = await supabase.functions.invoke('friend-profile-cache', {
        body: { action: 'get_profile', user_id: targetUserId },
      });

      let normalized: FriendProfileOptimizedData | null = null;
      if (edgeRes?.profile) {
        normalized = normalizeProfile(edgeRes.profile);
      }

      if (!normalized) {
        // 4) Cache miss - build cache in background and fallback to direct RPC
        supabase.functions.invoke('friend-profile-cache', {
          body: { action: 'build_cache', user_id: targetUserId },
        }).catch(() => {});

        const { data, error: profileError } = await supabase.rpc('get_friend_profile_with_all_data', {
          target_user_id: targetUserId,
          requesting_user_id: user.id,
        });

        if (profileError) {
          console.error('Error loading friend profile:', profileError);
          setError(profileError.message);
          if (!showedStats) setIsLoading(false);
          return;
        }
        normalized = normalizeProfile(data);
      }

      if (normalized) {
        setProfileData(normalized);
        try { localStorage.setItem(cacheKey, JSON.stringify(normalized)); } catch (e) {}
      }
    } catch (err: any) {
      console.error('Error loading friend profile (cached):', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, user]);

  useEffect(() => {
    loadProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadProfileData]);

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
    restaurants: profileData?.all_restaurants || [],
    wishlist: profileData?.all_wishlist || [],
  };
}

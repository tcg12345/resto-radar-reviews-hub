import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
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
  const { getFriendProfile } = useFriendProfiles();
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
    if (!targetUserId) return;

    setError(null);

    let seeded = false;
    // 1) Instant hydrate from localStorage
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as FriendProfileOptimizedData;
        setProfileData(parsed);
        setIsLoading(false);
        seeded = true;
      }
    } catch (_) {}

    // 2) Instant hydrate from in-memory context cache
    if (!seeded) {
      try {
        const ctx = getFriendProfile(targetUserId as string) as any;
        if (ctx) {
          const partial: FriendProfileOptimizedData = {
            can_view: true,
            username: ctx.username || '',
            name: ctx.name || '',
            avatar_url: ctx.avatar_url || '',
            is_public: !!ctx.is_public,
            rated_count: Number(ctx.rated_count) || 0,
            wishlist_count: Number(ctx.wishlist_count) || 0,
            avg_rating: Number(ctx.avg_rating) || 0,
            top_cuisine: '',
            michelin_count: 0,
            all_restaurants: [],
            all_wishlist: [],
            rating_distribution: {},
            cuisine_distribution: [],
            cities_distribution: [],
          };
          setProfileData(partial);
          setIsLoading(false);
          seeded = true;
        }
      } catch (_) {}
    }

    // 3) Fetch full restaurants data with minimal columns in parallel (fast)
    try {
      const selectCols = 'id,name,address,city,cuisine,rating,created_at,price_range,michelin_stars';
      const [ratedRes, wishRes] = await Promise.all([
        supabase
          .from('restaurants')
          .select(selectCols)
          .eq('user_id', targetUserId)
          .eq('is_wishlist', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('restaurants')
          .select(selectCols)
          .eq('user_id', targetUserId)
          .eq('is_wishlist', true)
          .order('created_at', { ascending: false }),
      ]);

      if (ratedRes.error) throw ratedRes.error;
      if (wishRes.error) throw wishRes.error;

      const rated = ratedRes.data || [];
      const wishlist = wishRes.data || [];

      const avg = rated.length
        ? rated.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / rated.length
        : (profileData?.avg_rating || 0);

      setProfileData((prev) => {
        const base = prev || {
          can_view: true,
          username: '',
          name: '',
          avatar_url: '',
          is_public: true,
          rated_count: 0,
          wishlist_count: 0,
          avg_rating: 0,
          top_cuisine: '',
          michelin_count: 0,
          all_restaurants: [],
          all_wishlist: [],
          rating_distribution: {},
          cuisine_distribution: [],
          cities_distribution: [],
        };
        const updated: FriendProfileOptimizedData = {
          ...base,
          all_restaurants: rated,
          all_wishlist: wishlist,
          rated_count: rated.length,
          wishlist_count: wishlist.length,
          avg_rating: base.avg_rating || avg,
        };
        return updated;
      });

      try {
        const toCache = {
          ...(profileData || {}),
          all_restaurants: rated,
          all_wishlist: wishlist,
          rated_count: rated.length,
          wishlist_count: wishlist.length,
          avg_rating: (profileData?.avg_rating || avg),
        } as FriendProfileOptimizedData;
        localStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch (_) {}

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading restaurants:', err);
      if (!seeded) setIsLoading(false);
      setError('Failed to load profile');
    }
  }, [targetUserId, getFriendProfile]);

  useEffect(() => {
    loadProfileData();
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

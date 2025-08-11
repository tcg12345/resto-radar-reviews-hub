import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RatingStats {
  avg: number | null;
  count: number;
}

// Clear cache for debugging
const statsCache = new Map<string, { friend: RatingStats; expert: RatingStats; ts: number }>();
const CACHE_TTL_MS = 0; // Disable cache temporarily for debugging

export function useRatingStats(placeId?: string, restaurantName?: string) {
  const { user } = useAuth();
  const [friendStats, setFriendStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [expertStats, setExpertStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!placeId) return;
      const normalizedName = (restaurantName || '').trim().toLowerCase();
      const cacheKey = `${placeId}:${normalizedName}:${user?.id || 'anon'}`;
      const cached = statsCache.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.ts < CACHE_TTL_MS) {
        setFriendStats(cached.friend);
        setExpertStats(cached.expert);
        return;
      }
      setLoading(true);
      try {
        console.log('🔍 Fetching rating stats for:', { placeId, restaurantName, userId: user?.id });
        
        // Debug: Check what friend ratings exist
        const debugRes = await supabase.rpc('debug_friend_ratings', { 
          place_id_param: placeId, 
          restaurant_name_param: restaurantName, 
          requesting_user_id: user?.id 
        });
        console.log('🔍 Debug friend ratings result:', debugRes);
        
        const [friendsRes, expertsRes] = await Promise.all([
          supabase.rpc('get_friend_rating_stats', { place_id_param: placeId, restaurant_name_param: restaurantName, requesting_user_id: user?.id }),
          supabase.rpc('get_expert_rating_stats', { place_id_param: placeId, restaurant_name_param: restaurantName }),
        ]);

        console.log('📊 Friends response:', friendsRes);
        console.log('📊 Experts response:', expertsRes);

        if (friendsRes.error) {
          console.error('❌ Friends RPC error:', friendsRes.error);
        }
        if (expertsRes.error) {
          console.error('❌ Experts RPC error:', expertsRes.error);
        }

        const friendRow: any = Array.isArray(friendsRes.data) ? friendsRes.data[0] : (friendsRes as any).data;
        const expertRow: any = Array.isArray(expertsRes.data) ? expertsRes.data[0] : (expertsRes as any).data;

        console.log('👥 Friend row data:', friendRow);
        console.log('🏆 Expert row data:', expertRow);

        const friend: RatingStats = friendRow ? {
          avg: friendRow.avg_rating ?? null,
          count: Number(friendRow.total_reviews) ?? 0,
        } : { avg: null, count: 0 };

        const expert: RatingStats = expertRow ? {
          avg: expertRow.avg_rating ?? null,
          count: Number(expertRow.total_reviews) ?? 0,
        } : { avg: null, count: 0 };

        console.log('📈 Final friend stats:', friend);
        console.log('📈 Final expert stats:', expert);

        setFriendStats(friend);
        setExpertStats(expert);
        statsCache.set(cacheKey, { friend, expert, ts: now });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [placeId, restaurantName, user?.id]);

  return { friendStats, expertStats, loading };
}


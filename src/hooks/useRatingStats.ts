import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RatingStats {
  avg: number | null;
  count: number;
}

// Simple in-memory cache to avoid repeat RPCs in a session
const statsCache = new Map<string, { friend: RatingStats; expert: RatingStats; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useRatingStats(placeId?: string) {
  const { user } = useAuth();
  const [friendStats, setFriendStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [expertStats, setExpertStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!placeId) return;
      const cacheKey = `${placeId}:${user?.id || 'anon'}`;
      const cached = statsCache.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.ts < CACHE_TTL_MS) {
        setFriendStats(cached.friend);
        setExpertStats(cached.expert);
        return;
      }
      setLoading(true);
      try {
        const [friendsRes, expertsRes] = await Promise.all([
          supabase.rpc('get_friend_rating_stats', { place_id_param: placeId, requesting_user_id: user?.id }),
          supabase.rpc('get_expert_rating_stats', { place_id_param: placeId }),
        ]);

        const friendRow: any = Array.isArray(friendsRes.data) ? friendsRes.data[0] : (friendsRes as any).data;
        const expertRow: any = Array.isArray(expertsRes.data) ? expertsRes.data[0] : (expertsRes as any).data;

        const friend: RatingStats = friendRow ? {
          avg: friendRow.avg_rating ?? null,
          count: friendRow.total_reviews ?? 0,
        } : { avg: null, count: 0 };

        const expert: RatingStats = expertRow ? {
          avg: expertRow.avg_rating ?? null,
          count: expertRow.total_reviews ?? 0,
        } : { avg: null, count: 0 };

        setFriendStats(friend);
        setExpertStats(expert);
        statsCache.set(cacheKey, { friend, expert, ts: now });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [placeId, user?.id]);

  return { friendStats, expertStats, loading };
}


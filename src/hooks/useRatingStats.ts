import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RatingStats {
  avg: number | null;
  count: number;
}

// Simple in-memory cache to avoid repeat RPCs in a session
const statsCache = new Map<string, { friend: RatingStats; expert: RatingStats; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function useRatingStats(placeId?: string) {
  const [friendStats, setFriendStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [expertStats, setExpertStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!placeId || !placeId.startsWith('ChI')) return; // only valid Google Place IDs
      const cached = statsCache.get(placeId);
      const now = Date.now();
      if (cached && now - cached.ts < CACHE_TTL_MS) {
        setFriendStats(cached.friend);
        setExpertStats(cached.expert);
        return;
      }
      setLoading(true);
      try {
        const [friendsRes, expertsRes] = await Promise.all([
          supabase.rpc('get_friend_rating_stats', { place_id_param: placeId }).maybeSingle(),
          supabase.rpc('get_expert_rating_stats', { place_id_param: placeId }).maybeSingle(),
        ]);

        const friend: RatingStats = friendsRes.data ? {
          avg: friendsRes.data.avg_rating ?? null,
          count: friendsRes.data.total_reviews ?? 0,
        } : { avg: null, count: 0 };

        const expert: RatingStats = expertsRes.data ? {
          avg: expertsRes.data.avg_rating ?? null,
          count: expertsRes.data.total_reviews ?? 0,
        } : { avg: null, count: 0 };

        setFriendStats(friend);
        setExpertStats(expert);
        statsCache.set(placeId, { friend, expert, ts: now });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [placeId]);

  return { friendStats, expertStats, loading };
}

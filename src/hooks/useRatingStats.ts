import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RatingStats {
  avg: number | null;
  count: number;
}

export function useRatingStats(placeId?: string) {
  const [friendStats, setFriendStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [expertStats, setExpertStats] = useState<RatingStats>({ avg: null, count: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!placeId) return;
      setLoading(true);
      try {
        const [friendsRes, expertsRes] = await Promise.all([
          supabase.rpc('get_friend_rating_stats', { place_id_param: placeId }).maybeSingle(),
          supabase.rpc('get_expert_rating_stats', { place_id_param: placeId }).maybeSingle(),
        ]);

        if (friendsRes.data) {
          setFriendStats({
            avg: friendsRes.data.avg_rating ?? null,
            count: friendsRes.data.total_reviews ?? 0,
          });
        } else {
          setFriendStats({ avg: null, count: 0 });
        }

        if (expertsRes.data) {
          setExpertStats({
            avg: expertsRes.data.avg_rating ?? null,
            count: expertsRes.data.total_reviews ?? 0,
          });
        } else {
          setExpertStats({ avg: null, count: 0 });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [placeId]);

  return { friendStats, expertStats, loading };
}

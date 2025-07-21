-- Performance optimization for friend profiles
-- Add critical indexes for ultra-fast queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_rating_date 
ON public.restaurants (user_id, rating DESC, created_at DESC) 
WHERE is_wishlist = false AND rating IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_wishlist_created 
ON public.restaurants (user_id, created_at DESC) 
WHERE is_wishlist = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_cuisine_rating 
ON public.restaurants (user_id, cuisine, rating) 
WHERE is_wishlist = false AND rating IS NOT NULL;

-- Create ultra-fast friend profile function
CREATE OR REPLACE FUNCTION public.get_fast_friend_profile(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT auth.uid()
) RETURNS TABLE(
  can_view BOOLEAN,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  is_public BOOLEAN,
  rated_count BIGINT,
  wishlist_count BIGINT,
  avg_rating NUMERIC,
  recent_restaurants JSONB
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  user_can_view BOOLEAN := false;
  profile_record RECORD;
BEGIN
  -- Get profile and check permissions in one query
  SELECT p.username, p.name, p.avatar_url, p.is_public,
         (p.is_public OR EXISTS (
           SELECT 1 FROM public.friends f
           WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
              OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
         )) as can_access
  INTO profile_record
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND OR NOT profile_record.can_access THEN
    RETURN QUERY SELECT 
      false, profile_record.username, profile_record.name, 
      profile_record.avatar_url, profile_record.is_public,
      0::BIGINT, 0::BIGINT, 0::NUMERIC, '[]'::JSONB;
    RETURN;
  END IF;
  
  -- Get stats and recent restaurants in one efficient query
  RETURN QUERY
  WITH restaurant_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE r.rating IS NOT NULL)::BIGINT as rated_count,
      COUNT(*) FILTER (WHERE r.is_wishlist = true)::BIGINT as wishlist_count,
      AVG(r.rating) FILTER (WHERE r.rating IS NOT NULL)::NUMERIC as avg_rating
    FROM public.restaurants r
    WHERE r.user_id = target_user_id
  ),
  recent_restaurants AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'cuisine', r.cuisine,
        'rating', r.rating,
        'created_at', r.created_at
      ) ORDER BY r.created_at DESC
    ) as restaurants
    FROM (
      SELECT id, name, cuisine, rating, created_at
      FROM public.restaurants r
      WHERE r.user_id = target_user_id 
        AND r.is_wishlist = false 
        AND r.rating IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 5
    ) r
  )
  SELECT 
    true,
    profile_record.username,
    profile_record.name,
    profile_record.avatar_url,
    profile_record.is_public,
    COALESCE(s.rated_count, 0),
    COALESCE(s.wishlist_count, 0),
    COALESCE(s.avg_rating, 0),
    COALESCE(rr.restaurants, '[]'::JSONB)
  FROM restaurant_stats s
  CROSS JOIN recent_restaurants rr;
END;
$$;
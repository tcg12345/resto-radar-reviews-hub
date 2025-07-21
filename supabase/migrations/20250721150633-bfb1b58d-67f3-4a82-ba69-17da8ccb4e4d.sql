-- Performance optimization for friend profiles (without CONCURRENTLY)
-- Add critical indexes for ultra-fast queries
CREATE INDEX IF NOT EXISTS idx_restaurants_user_rating_date 
ON public.restaurants (user_id, rating DESC, created_at DESC) 
WHERE is_wishlist = false AND rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_user_wishlist_created 
ON public.restaurants (user_id, created_at DESC) 
WHERE is_wishlist = true;

CREATE INDEX IF NOT EXISTS idx_restaurants_user_cuisine_rating 
ON public.restaurants (user_id, cuisine, rating) 
WHERE is_wishlist = false AND rating IS NOT NULL;

-- Create ultra-fast friend profile function
CREATE OR REPLACE FUNCTION public.get_lightning_fast_friend_profile(
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
  profile_record RECORD;
  can_access BOOLEAN := false;
BEGIN
  -- Get profile and check permissions in one super-fast query
  SELECT 
    p.username, 
    p.name, 
    p.avatar_url, 
    p.is_public,
    (p.is_public OR EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
         OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
    )) as has_access
  INTO profile_record
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND OR NOT profile_record.has_access THEN
    RETURN QUERY SELECT 
      false, profile_record.username, profile_record.name, 
      profile_record.avatar_url, profile_record.is_public,
      0::BIGINT, 0::BIGINT, 0::NUMERIC, '[]'::JSONB;
    RETURN;
  END IF;
  
  -- Lightning-fast stats query using the new indexes
  RETURN QUERY
  SELECT 
    true,
    profile_record.username,
    profile_record.name,
    profile_record.avatar_url,
    profile_record.is_public,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants 
       WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL), 
      0
    )::BIGINT as rated_count,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants 
       WHERE user_id = target_user_id AND is_wishlist = true), 
      0
    )::BIGINT as wishlist_count,
    COALESCE(
      (SELECT AVG(rating) FROM public.restaurants 
       WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL), 
      0
    )::NUMERIC as avg_rating,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'cuisine', cuisine,
          'rating', rating,
          'created_at', created_at
        )
      ) FROM (
        SELECT id, name, cuisine, rating, created_at
        FROM public.restaurants 
        WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
      ) recent), 
      '[]'::JSONB
    ) as recent_restaurants;
END;
$$;
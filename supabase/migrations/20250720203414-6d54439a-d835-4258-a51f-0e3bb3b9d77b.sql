
-- Create optimized function for combined friend profile data
CREATE OR REPLACE FUNCTION public.get_friend_profile_data(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT auth.uid(),
  restaurant_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  -- Permission and profile info
  can_view BOOLEAN,
  username TEXT,
  name TEXT,
  avatar_url TEXT,
  is_public BOOLEAN,
  -- Stats
  rated_count INTEGER,
  wishlist_count INTEGER,
  avg_rating NUMERIC,
  top_cuisine TEXT,
  michelin_count INTEGER,
  -- Recent restaurants (JSON for efficiency)
  recent_restaurants JSONB
) 
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_can_view BOOLEAN := false;
  profile_data RECORD;
BEGIN
  -- Get profile data and check permissions
  SELECT p.username, p.name, p.avatar_url, p.is_public
  INTO profile_data
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if user can view (public profile or friends)
  user_can_view := profile_data.is_public OR EXISTS (
    SELECT 1 FROM public.friends f
    WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
       OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
  );
  
  IF NOT user_can_view THEN
    -- Return minimal data for private profiles
    RETURN QUERY SELECT 
      false as can_view,
      profile_data.username,
      profile_data.name,
      profile_data.avatar_url,
      profile_data.is_public,
      0 as rated_count,
      0 as wishlist_count,
      0::NUMERIC as avg_rating,
      ''::TEXT as top_cuisine,
      0 as michelin_count,
      '[]'::JSONB as recent_restaurants;
    RETURN;
  END IF;
  
  -- Return comprehensive data for accessible profiles
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL)::INTEGER as rated_count,
      COUNT(*) FILTER (WHERE is_wishlist = true)::INTEGER as wishlist_count,
      AVG(rating) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL)::NUMERIC as avg_rating,
      MODE() WITHIN GROUP (ORDER BY cuisine) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL) as top_cuisine,
      COUNT(*) FILTER (WHERE michelin_stars > 0 AND is_wishlist = false)::INTEGER as michelin_count
    FROM public.restaurants 
    WHERE user_id = target_user_id
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'name', r.name,
        'cuisine', r.cuisine,
        'rating', r.rating,
        'date_visited', r.date_visited,
        'created_at', r.created_at
      ) ORDER BY COALESCE(r.date_visited, r.created_at) DESC
    ) as recent_restaurants
    FROM public.restaurants r
    WHERE r.user_id = target_user_id 
      AND r.is_wishlist = false 
      AND r.rating IS NOT NULL
    LIMIT restaurant_limit
  )
  SELECT 
    true as can_view,
    profile_data.username,
    profile_data.name,
    profile_data.avatar_url,
    profile_data.is_public,
    COALESCE(s.rated_count, 0) as rated_count,
    COALESCE(s.wishlist_count, 0) as wishlist_count,
    COALESCE(s.avg_rating, 0) as avg_rating,
    COALESCE(s.top_cuisine, '') as top_cuisine,
    COALESCE(s.michelin_count, 0) as michelin_count,
    COALESCE(r.recent_restaurants, '[]'::JSONB) as recent_restaurants
  FROM stats s
  CROSS JOIN recent r;
END;
$$;

-- Create optimized function for friends activity feed
CREATE OR REPLACE FUNCTION public.get_friends_recent_activity(
  requesting_user_id UUID DEFAULT auth.uid(),
  activity_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  restaurant_id UUID,
  restaurant_name TEXT,
  cuisine TEXT,
  rating NUMERIC,
  date_visited TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  friend_id UUID,
  friend_username TEXT
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.cuisine,
    r.rating,
    r.date_visited,
    r.created_at,
    r.user_id as friend_id,
    p.username as friend_username
  FROM public.restaurants r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN public.friends f ON (
    (f.user1_id = requesting_user_id AND f.user2_id = r.user_id) OR
    (f.user2_id = requesting_user_id AND f.user1_id = r.user_id)
  )
  WHERE r.is_wishlist = false 
    AND r.rating IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  LIMIT activity_limit;
$$;

-- Add additional indexes for the new functions
CREATE INDEX IF NOT EXISTS idx_restaurants_user_wishlist_date 
ON public.restaurants (user_id, is_wishlist, COALESCE(date_visited, created_at) DESC) 
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_michelin_user 
ON public.restaurants (user_id, michelin_stars) 
WHERE michelin_stars > 0 AND is_wishlist = false;

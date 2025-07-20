-- Create comprehensive friend profile cache table
CREATE TABLE public.friend_profile_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- The profile owner
  profile_data JSONB NOT NULL, -- Complete pre-computed profile with stats, restaurants, etc.
  restaurant_count INTEGER NOT NULL DEFAULT 0,
  wishlist_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friend_profile_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing cached profiles
CREATE POLICY "Anyone can view cached friend profiles" 
ON public.friend_profile_cache 
FOR SELECT 
USING (
  -- User can view their own cache
  auth.uid() = user_id OR
  -- User can view public profiles
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = user_id AND p.is_public = true
  ) OR
  -- User can view friends' profiles
  EXISTS (
    SELECT 1 FROM public.friends f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = user_id)
  )
);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX idx_friend_profile_cache_user 
ON public.friend_profile_cache (user_id);

-- Create function to build complete profile cache
CREATE OR REPLACE FUNCTION public.build_friend_profile_cache(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_info RECORD;
  restaurants_data JSONB;
  wishlist_data JSONB;
  stats_data JSONB;
  recent_activity JSONB;
  complete_profile JSONB;
BEGIN
  -- Get basic profile info
  SELECT p.username, p.name, p.avatar_url, p.is_public
  INTO profile_info
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Profile not found"}'::JSONB;
  END IF;
  
  -- Get all restaurants (rated and wishlist) with pagination support
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'cuisine', r.cuisine,
      'rating', r.rating,
      'address', r.address,
      'city', r.city,
      'country', r.country,
      'price_range', r.price_range,
      'michelin_stars', r.michelin_stars,
      'date_visited', r.date_visited,
      'created_at', r.created_at,
      'notes', r.notes,
      'photos', r.photos,
      'is_wishlist', r.is_wishlist,
      'latitude', r.latitude,
      'longitude', r.longitude,
      'website', r.website,
      'reservable', r.reservable,
      'reservation_url', r.reservation_url,
      'opening_hours', r.opening_hours
    ) ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  )
  INTO restaurants_data
  FROM public.restaurants r
  WHERE r.user_id = target_user_id AND r.is_wishlist = false;
  
  -- Get wishlist items
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'cuisine', r.cuisine,
      'address', r.address,
      'city', r.city,
      'country', r.country,
      'price_range', r.price_range,
      'michelin_stars', r.michelin_stars,
      'created_at', r.created_at,
      'notes', r.notes,
      'photos', r.photos,
      'latitude', r.latitude,
      'longitude', r.longitude,
      'website', r.website,
      'reservable', r.reservable,
      'reservation_url', r.reservation_url,
      'opening_hours', r.opening_hours
    ) ORDER BY r.created_at DESC
  )
  INTO wishlist_data
  FROM public.restaurants r
  WHERE r.user_id = target_user_id AND r.is_wishlist = true;
  
  -- Calculate comprehensive stats
  WITH rating_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_rated,
      AVG(rating)::NUMERIC as avg_rating,
      COUNT(*) FILTER (WHERE michelin_stars > 0)::INTEGER as michelin_count,
      MODE() WITHIN GROUP (ORDER BY cuisine) as top_cuisine
    FROM public.restaurants 
    WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL
  ),
  cuisine_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('cuisine', cuisine, 'count', count)
      ORDER BY count DESC
    ) as top_cuisines
    FROM (
      SELECT cuisine, COUNT(*) as count
      FROM public.restaurants 
      WHERE user_id = target_user_id AND is_wishlist = false AND cuisine IS NOT NULL
      GROUP BY cuisine
      ORDER BY count DESC
      LIMIT 10
    ) cuisine_counts
  ),
  rating_distribution AS (
    SELECT jsonb_build_object(
      '0-2', COUNT(*) FILTER (WHERE rating >= 0 AND rating < 2),
      '2-4', COUNT(*) FILTER (WHERE rating >= 2 AND rating < 4),
      '4-6', COUNT(*) FILTER (WHERE rating >= 4 AND rating < 6),
      '6-8', COUNT(*) FILTER (WHERE rating >= 6 AND rating < 8),
      '8-10', COUNT(*) FILTER (WHERE rating >= 8 AND rating <= 10)
    ) as distribution
    FROM public.restaurants 
    WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL
  ),
  wishlist_stats AS (
    SELECT COUNT(*)::INTEGER as total_wishlist
    FROM public.restaurants 
    WHERE user_id = target_user_id AND is_wishlist = true
  )
  SELECT jsonb_build_object(
    'total_rated', COALESCE(rs.total_rated, 0),
    'total_wishlist', COALESCE(ws.total_wishlist, 0),
    'avg_rating', COALESCE(rs.avg_rating, 0),
    'michelin_count', COALESCE(rs.michelin_count, 0),
    'top_cuisine', COALESCE(rs.top_cuisine, ''),
    'top_cuisines', COALESCE(cs.top_cuisines, '[]'::jsonb),
    'rating_distribution', COALESCE(rd.distribution, '{}'::jsonb)
  )
  INTO stats_data
  FROM rating_stats rs
  CROSS JOIN cuisine_stats cs
  CROSS JOIN rating_distribution rd
  CROSS JOIN wishlist_stats ws;
  
  -- Get recent activity (last 20 restaurants)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'cuisine', r.cuisine,
      'rating', r.rating,
      'date_visited', r.date_visited,
      'created_at', r.created_at
    ) ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  )
  INTO recent_activity
  FROM (
    SELECT * FROM public.restaurants r
    WHERE r.user_id = target_user_id AND r.is_wishlist = false AND r.rating IS NOT NULL
    ORDER BY COALESCE(r.date_visited, r.created_at) DESC
    LIMIT 20
  ) r;
  
  -- Build complete profile JSON
  complete_profile := jsonb_build_object(
    'profile', jsonb_build_object(
      'id', target_user_id,
      'username', profile_info.username,
      'name', profile_info.name,
      'avatar_url', profile_info.avatar_url,
      'is_public', profile_info.is_public
    ),
    'stats', stats_data,
    'restaurants', COALESCE(restaurants_data, '[]'::jsonb),
    'wishlist', COALESCE(wishlist_data, '[]'::jsonb),
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb),
    'last_updated', now()
  );
  
  -- Insert or update cache
  INSERT INTO public.friend_profile_cache (user_id, profile_data, restaurant_count, wishlist_count)
  VALUES (
    target_user_id, 
    complete_profile,
    jsonb_array_length(COALESCE(restaurants_data, '[]'::jsonb)),
    jsonb_array_length(COALESCE(wishlist_data, '[]'::jsonb))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_data = EXCLUDED.profile_data,
    restaurant_count = EXCLUDED.restaurant_count,
    wishlist_count = EXCLUDED.wishlist_count,
    last_updated = now();
  
  RETURN complete_profile;
END;
$$;

-- Create trigger to invalidate profile cache when restaurants change
CREATE OR REPLACE FUNCTION public.invalidate_profile_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete the cached profile for this user
  DELETE FROM public.friend_profile_cache 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on restaurants table
DROP TRIGGER IF EXISTS restaurants_profile_cache_invalidation ON public.restaurants;
CREATE TRIGGER restaurants_profile_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_profile_cache();

-- Create function for fast cached profile retrieval
CREATE OR REPLACE FUNCTION public.get_cached_friend_profile(
  target_user_id UUID,
  requesting_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  cached_profile JSONB;
  can_view BOOLEAN := false;
BEGIN
  -- Check if requesting user can view this profile
  SELECT 
    p.is_public OR 
    requesting_user_id = target_user_id OR
    EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
         OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
    )
  INTO can_view
  FROM public.profiles p
  WHERE p.id = target_user_id;
  
  IF NOT can_view THEN
    RETURN '{"error": "Access denied"}'::JSONB;
  END IF;
  
  -- Try to get cached profile
  SELECT profile_data INTO cached_profile
  FROM public.friend_profile_cache
  WHERE user_id = target_user_id;
  
  -- If no cache exists, build it
  IF cached_profile IS NULL THEN
    cached_profile := public.build_friend_profile_cache(target_user_id);
  END IF;
  
  RETURN cached_profile;
END;
$$;
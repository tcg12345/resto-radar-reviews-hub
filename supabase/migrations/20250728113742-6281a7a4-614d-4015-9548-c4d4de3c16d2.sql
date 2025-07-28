-- Create optimized friend profile function with pagination support
CREATE OR REPLACE FUNCTION public.get_friend_profile_with_pagination(
  target_user_id uuid, 
  requesting_user_id uuid DEFAULT auth.uid(),
  restaurant_limit integer DEFAULT 20,
  restaurant_offset integer DEFAULT 0,
  wishlist_limit integer DEFAULT 20,
  wishlist_offset integer DEFAULT 0
)
RETURNS TABLE(
  can_view boolean, 
  username text, 
  name text, 
  avatar_url text, 
  is_public boolean, 
  rated_count bigint, 
  wishlist_count bigint, 
  avg_rating numeric, 
  top_cuisine text,
  michelin_count bigint,
  restaurants jsonb,
  wishlist jsonb,
  has_more_restaurants boolean,
  has_more_wishlist boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_record RECORD;
  can_access BOOLEAN := false;
  total_restaurants bigint;
  total_wishlist bigint;
BEGIN
  -- Validate limits for security
  restaurant_limit := LEAST(restaurant_limit, 50);
  wishlist_limit := LEAST(wishlist_limit, 50);
  
  -- Get profile and check permissions
  SELECT 
    p.username, 
    p.name, 
    p.avatar_url, 
    p.is_public,
    (p.is_public OR requesting_user_id = target_user_id OR EXISTS (
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
      0::bigint, 0::bigint, 0::numeric, ''::text, 0::bigint,
      '[]'::jsonb, '[]'::jsonb, false, false;
    RETURN;
  END IF;
  
  -- Get total counts for pagination
  SELECT 
    COUNT(*) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL),
    COUNT(*) FILTER (WHERE is_wishlist = true)
  INTO total_restaurants, total_wishlist
  FROM public.restaurants 
  WHERE user_id = target_user_id;
  
  -- Get paginated data efficiently
  RETURN QUERY
  WITH stats AS (
    SELECT 
      total_restaurants as rated_count,
      total_wishlist as wishlist_count,
      AVG(rating) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL) as avg_rating,
      MODE() WITHIN GROUP (ORDER BY cuisine) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL) as top_cuisine,
      COUNT(*) FILTER (WHERE michelin_stars > 0 AND is_wishlist = false)::bigint as michelin_count
    FROM public.restaurants 
    WHERE user_id = target_user_id
  ),
  paginated_restaurants AS (
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
        'latitude', r.latitude,
        'longitude', r.longitude,
        'website', r.website,
        'phone_number', r.phone_number,
        'opening_hours', r.opening_hours,
        'reservable', r.reservable,
        'reservation_url', r.reservation_url
      ) ORDER BY COALESCE(r.date_visited, r.created_at) DESC
    ) as restaurants
    FROM (
      SELECT * FROM public.restaurants
      WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL
      ORDER BY COALESCE(date_visited, created_at) DESC
      LIMIT restaurant_limit OFFSET restaurant_offset
    ) r
  ),
  paginated_wishlist AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', w.id,
        'name', w.name,
        'cuisine', w.cuisine,
        'address', w.address,
        'city', w.city,
        'country', w.country,
        'price_range', w.price_range,
        'michelin_stars', w.michelin_stars,
        'created_at', w.created_at,
        'notes', w.notes,
        'photos', w.photos,
        'latitude', w.latitude,
        'longitude', w.longitude,
        'website', w.website,
        'phone_number', w.phone_number,
        'opening_hours', w.opening_hours,
        'reservable', w.reservable,
        'reservation_url', w.reservation_url
      ) ORDER BY w.created_at DESC
    ) as wishlist
    FROM (
      SELECT * FROM public.restaurants
      WHERE user_id = target_user_id AND is_wishlist = true
      ORDER BY created_at DESC
      LIMIT wishlist_limit OFFSET wishlist_offset
    ) w
  )
  SELECT 
    true as can_view,
    profile_record.username,
    profile_record.name,
    profile_record.avatar_url,
    profile_record.is_public,
    s.rated_count,
    s.wishlist_count,
    COALESCE(s.avg_rating, 0) as avg_rating,
    COALESCE(s.top_cuisine, '') as top_cuisine,
    s.michelin_count,
    COALESCE(pr.restaurants, '[]'::jsonb) as restaurants,
    COALESCE(pw.wishlist, '[]'::jsonb) as wishlist,
    (restaurant_offset + restaurant_limit < s.rated_count) as has_more_restaurants,
    (wishlist_offset + wishlist_limit < s.wishlist_count) as has_more_wishlist
  FROM stats s
  CROSS JOIN paginated_restaurants pr
  CROSS JOIN paginated_wishlist pw;
END;
$function$

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_wishlist_rating 
ON public.restaurants (user_id, is_wishlist, rating) 
WHERE rating IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_wishlist_created 
ON public.restaurants (user_id, is_wishlist, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_date_visited 
ON public.restaurants (user_id, date_visited DESC NULLS LAST, created_at DESC) 
WHERE is_wishlist = false;

-- Update the existing build_friend_profile_cache function to use limits
CREATE OR REPLACE FUNCTION public.build_friend_profile_cache(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_info RECORD;
  restaurants_data JSONB;
  wishlist_data JSONB;
  stats_data JSONB;
  recent_activity JSONB;
  complete_profile JSONB;
BEGIN
  -- Validate input
  IF target_user_id IS NULL THEN
    RETURN '{"error": "Invalid user ID"}'::JSONB;
  END IF;
  
  -- Get basic profile info
  SELECT p.username, p.name, p.avatar_url, p.is_public
  INTO profile_info
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Profile not found"}'::JSONB;
  END IF;
  
  -- Get recent restaurants only (limit 50 for cache performance)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', rest.id,
      'name', rest.name,
      'cuisine', rest.cuisine,
      'rating', rest.rating,
      'address', rest.address,
      'city', rest.city,
      'country', rest.country,
      'price_range', rest.price_range,
      'michelin_stars', rest.michelin_stars,
      'date_visited', rest.date_visited,
      'created_at', rest.created_at,
      'notes', rest.notes,
      'photos', rest.photos,
      'is_wishlist', rest.is_wishlist,
      'latitude', rest.latitude,
      'longitude', rest.longitude,
      'website', rest.website,
      'reservable', rest.reservable,
      'reservation_url', rest.reservation_url,
      'opening_hours', rest.opening_hours
    ) ORDER BY COALESCE(rest.date_visited, rest.created_at) DESC
  )
  INTO restaurants_data
  FROM (
    SELECT * FROM public.restaurants
    WHERE user_id = target_user_id AND is_wishlist = false
    ORDER BY COALESCE(date_visited, created_at) DESC
    LIMIT 50 -- Reasonable limit for cache
  ) rest;
  
  -- Get recent wishlist items only (limit 50 for cache performance)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', wish.id,
      'name', wish.name,
      'cuisine', wish.cuisine,
      'address', wish.address,
      'city', wish.city,
      'country', wish.country,
      'price_range', wish.price_range,
      'michelin_stars', wish.michelin_stars,
      'created_at', wish.created_at,
      'notes', wish.notes,
      'photos', wish.photos,
      'latitude', wish.latitude,
      'longitude', wish.longitude,
      'website', wish.website,
      'reservable', wish.reservable,
      'reservation_url', wish.reservation_url,
      'opening_hours', wish.opening_hours
    ) ORDER BY wish.created_at DESC
  )
  INTO wishlist_data
  FROM (
    SELECT * FROM public.restaurants
    WHERE user_id = target_user_id AND is_wishlist = true
    ORDER BY created_at DESC
    LIMIT 50 -- Reasonable limit for cache
  ) wish;
  
  -- Calculate stats efficiently
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
  
  -- Get recent activity (limit 20 for performance)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', recent.id,
      'name', recent.name,
      'cuisine', recent.cuisine,
      'rating', recent.rating,
      'date_visited', recent.date_visited,
      'created_at', recent.created_at
    ) ORDER BY COALESCE(recent.date_visited, recent.created_at) DESC
  )
  INTO recent_activity
  FROM (
    SELECT * FROM public.restaurants
    WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL
    ORDER BY COALESCE(date_visited, created_at) DESC
    LIMIT 20
  ) recent;
  
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
  
  -- Insert or update cache with actual counts
  INSERT INTO public.friend_profile_cache (user_id, profile_data, restaurant_count, wishlist_count)
  VALUES (
    target_user_id, 
    complete_profile,
    COALESCE(jsonb_array_length(restaurants_data), 0),
    COALESCE(jsonb_array_length(wishlist_data), 0)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_data = EXCLUDED.profile_data,
    restaurant_count = EXCLUDED.restaurant_count,
    wishlist_count = EXCLUDED.wishlist_count,
    last_updated = now();
  
  RETURN complete_profile;
END;
$function$
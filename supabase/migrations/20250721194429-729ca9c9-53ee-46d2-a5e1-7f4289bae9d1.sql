-- Update get_friend_profile_data to remove restaurant limit and load all restaurants
CREATE OR REPLACE FUNCTION public.get_friend_profile_data(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), restaurant_limit integer DEFAULT 1000)
 RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count integer, wishlist_count integer, avg_rating numeric, top_cuisine text, michelin_count integer, recent_restaurants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_can_view BOOLEAN := false;
  profile_data RECORD;
BEGIN
  -- Get profile data and check permissions with explicit column references
  SELECT p.username, p.name, p.avatar_url, p.is_public
  INTO profile_data
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if user can view with explicit column references
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
  
  -- Return comprehensive data with ALL restaurants (no limit)
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE rest.is_wishlist = false AND rest.rating IS NOT NULL)::INTEGER as rated_count,
      COUNT(*) FILTER (WHERE rest.is_wishlist = true)::INTEGER as wishlist_count,
      AVG(rest.rating) FILTER (WHERE rest.is_wishlist = false AND rest.rating IS NOT NULL)::NUMERIC as avg_rating,
      MODE() WITHIN GROUP (ORDER BY rest.cuisine) FILTER (WHERE rest.is_wishlist = false AND rest.rating IS NOT NULL) as top_cuisine,
      COUNT(*) FILTER (WHERE rest.michelin_stars > 0 AND rest.is_wishlist = false)::INTEGER as michelin_count
    FROM public.restaurants rest 
    WHERE rest.user_id = target_user_id
  ),
  recent AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', rest.id,
        'name', rest.name,
        'cuisine', rest.cuisine,
        'rating', rest.rating,
        'date_visited', rest.date_visited,
        'created_at', rest.created_at,
        'address', rest.address,
        'city', rest.city,
        'country', rest.country,
        'price_range', rest.price_range,
        'michelin_stars', rest.michelin_stars,
        'notes', rest.notes,
        'photos', rest.photos,
        'latitude', rest.latitude,
        'longitude', rest.longitude,
        'website', rest.website,
        'phone_number', rest.phone_number,
        'opening_hours', rest.opening_hours,
        'reservable', rest.reservable,
        'reservation_url', rest.reservation_url,
        'is_wishlist', rest.is_wishlist
      ) ORDER BY COALESCE(rest.date_visited, rest.created_at) DESC
    ) as recent_restaurants
    FROM public.restaurants rest
    WHERE rest.user_id = target_user_id 
      AND rest.is_wishlist = false 
      AND rest.rating IS NOT NULL
    -- NO LIMIT - return ALL restaurants
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
$function$;

-- Update build_friend_profile_cache to remove limits and load all data
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
  
  -- Get ALL restaurants (no limit) with proper alias
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
  FROM public.restaurants rest
  WHERE rest.user_id = target_user_id AND rest.is_wishlist = false
  ORDER BY COALESCE(rest.date_visited, rest.created_at) DESC;
  -- NO LIMIT - load all restaurants
  
  -- Get ALL wishlist items (no limit) with proper alias
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
  FROM public.restaurants wish
  WHERE wish.user_id = target_user_id AND wish.is_wishlist = true
  ORDER BY wish.created_at DESC;
  -- NO LIMIT - load all wishlist items
  
  -- Calculate stats with proper validation and aliases
  WITH rating_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total_rated,
      AVG(rating)::NUMERIC as avg_rating,
      COUNT(*) FILTER (WHERE michelin_stars > 0)::INTEGER as michelin_count,
      MODE() WITHIN GROUP (ORDER BY cuisine) as top_cuisine
    FROM public.restaurants stat_rest
    WHERE stat_rest.user_id = target_user_id AND stat_rest.is_wishlist = false AND stat_rest.rating IS NOT NULL
  ),
  cuisine_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object('cuisine', cuisine, 'count', count)
      ORDER BY count DESC
    ) as top_cuisines
    FROM (
      SELECT cuis_rest.cuisine, COUNT(*) as count
      FROM public.restaurants cuis_rest
      WHERE cuis_rest.user_id = target_user_id AND cuis_rest.is_wishlist = false AND cuis_rest.cuisine IS NOT NULL
      GROUP BY cuis_rest.cuisine
      ORDER BY count DESC
      -- Keep limit of 10 cuisines for UI performance
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
    FROM public.restaurants dist_rest
    WHERE dist_rest.user_id = target_user_id AND dist_rest.is_wishlist = false AND dist_rest.rating IS NOT NULL
  ),
  wishlist_stats AS (
    SELECT COUNT(*)::INTEGER as total_wishlist
    FROM public.restaurants wish_count
    WHERE wish_count.user_id = target_user_id AND wish_count.is_wishlist = true
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
  
  -- Get recent activity (keep limit of 20 for performance) with proper alias
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
    SELECT * FROM public.restaurants recent_sub
    WHERE recent_sub.user_id = target_user_id AND recent_sub.is_wishlist = false AND recent_sub.rating IS NOT NULL
    ORDER BY COALESCE(recent_sub.date_visited, recent_sub.created_at) DESC
    LIMIT 20 -- Keep reasonable limit for performance
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
  
  -- Insert or update cache with actual counts (no artificial limits)
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
$function$;
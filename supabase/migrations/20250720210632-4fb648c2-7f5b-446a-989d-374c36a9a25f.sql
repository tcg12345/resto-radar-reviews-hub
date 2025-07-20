-- Fix database functions security: Add proper search_path settings to prevent search_path manipulation attacks

-- Update all functions to include proper search_path settings
CREATE OR REPLACE FUNCTION public.round_rating_to_two_decimals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Round the rating to 2 decimal places if it's not null
  IF NEW.rating IS NOT NULL THEN
    NEW.rating := ROUND(NEW.rating::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if email exists in profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_to_check
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id UUID)
RETURNS TABLE (
  rated_count INTEGER,
  wishlist_count INTEGER,
  avg_rating NUMERIC,
  top_cuisine TEXT
) 
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH rated_stats AS (
    SELECT 
      COUNT(*)::INTEGER as rated_count,
      AVG(rating)::NUMERIC as avg_rating,
      MODE() WITHIN GROUP (ORDER BY cuisine) as top_cuisine
    FROM public.restaurants 
    WHERE user_id = target_user_id 
      AND is_wishlist = false 
      AND rating IS NOT NULL
  ),
  wishlist_stats AS (
    SELECT COUNT(*)::INTEGER as wishlist_count
    FROM public.restaurants 
    WHERE user_id = target_user_id 
      AND is_wishlist = true
  )
  SELECT 
    COALESCE(r.rated_count, 0) as rated_count,
    COALESCE(w.wishlist_count, 0) as wishlist_count,
    COALESCE(r.avg_rating, 0) as avg_rating,
    COALESCE(r.top_cuisine, '') as top_cuisine
  FROM rated_stats r
  CROSS JOIN wishlist_stats w;
$$;

CREATE OR REPLACE FUNCTION public.get_friend_profile_data(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), restaurant_limit integer DEFAULT 20)
RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count integer, wishlist_count integer, avg_rating numeric, top_cuisine text, michelin_count integer, recent_restaurants jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.get_friends_recent_activity(requesting_user_id uuid DEFAULT auth.uid(), activity_limit integer DEFAULT 10)
RETURNS TABLE(restaurant_id uuid, restaurant_name text, cuisine text, rating numeric, date_visited timestamp with time zone, created_at timestamp with time zone, friend_id uuid, friend_username text)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
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

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  sender_id UUID;
  receiver_id UUID;
BEGIN
  -- Get the request details
  SELECT fr.sender_id, fr.receiver_id 
  INTO sender_id, receiver_id
  FROM public.friend_requests fr 
  WHERE fr.id = request_id AND fr.receiver_id = auth.uid() AND fr.status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  -- Update the request status
  UPDATE public.friend_requests 
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship (ensure consistent ordering)
  IF sender_id < receiver_id THEN
    INSERT INTO public.friends (user1_id, user2_id) VALUES (sender_id, receiver_id);
  ELSE
    INSERT INTO public.friends (user1_id, user2_id) VALUES (receiver_id, sender_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_score(user_id uuid)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.restaurants 
  WHERE user_id = $1 AND rating IS NOT NULL AND is_wishlist = false;
$$;

CREATE OR REPLACE FUNCTION public.rebuild_friend_activity_cache(target_user_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete existing cache for this user
  DELETE FROM public.friend_activity_cache WHERE user_id = target_user_id;
  
  -- Rebuild cache with latest friend activities (limited to 10 items)
  INSERT INTO public.friend_activity_cache (user_id, friend_id, restaurant_id, activity_data, activity_date)
  SELECT 
    target_user_id as user_id,
    r.user_id as friend_id,
    r.id as restaurant_id,
    jsonb_build_object(
      'restaurant_id', r.id,
      'restaurant_name', r.name,
      'cuisine', r.cuisine,
      'rating', r.rating,
      'date_visited', r.date_visited,
      'created_at', r.created_at,
      'friend_id', r.user_id,
      'friend_username', p.username,
      'address', r.address,
      'city', r.city,
      'michelin_stars', r.michelin_stars,
      'price_range', r.price_range,
      'notes', r.notes
    ) as activity_data,
    COALESCE(r.date_visited, r.created_at) as activity_date
  FROM public.restaurants r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN public.friends f ON (
    (f.user1_id = target_user_id AND f.user2_id = r.user_id) OR
    (f.user2_id = target_user_id AND f.user1_id = r.user_id)
  )
  WHERE r.is_wishlist = false 
    AND r.rating IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  LIMIT 10; -- Limit to 10 activities per user for security
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_friend_caches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Get all friends of the user who made the change
  DELETE FROM public.friend_activity_cache 
  WHERE friend_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Rebuild caches for all friends of this user (limited)
  INSERT INTO public.friend_activity_cache (user_id, friend_id, restaurant_id, activity_data, activity_date)
  SELECT 
    CASE 
      WHEN f.user1_id = COALESCE(NEW.user_id, OLD.user_id) THEN f.user2_id
      ELSE f.user1_id
    END as user_id,
    COALESCE(NEW.user_id, OLD.user_id) as friend_id,
    COALESCE(NEW.id, OLD.id) as restaurant_id,
    jsonb_build_object(
      'restaurant_id', COALESCE(NEW.id, OLD.id),
      'restaurant_name', COALESCE(NEW.name, OLD.name),
      'cuisine', COALESCE(NEW.cuisine, OLD.cuisine),
      'rating', COALESCE(NEW.rating, OLD.rating),
      'date_visited', COALESCE(NEW.date_visited, OLD.date_visited),
      'created_at', COALESCE(NEW.created_at, OLD.created_at),
      'friend_id', COALESCE(NEW.user_id, OLD.user_id),
      'friend_username', p.username,
      'address', COALESCE(NEW.address, OLD.address),
      'city', COALESCE(NEW.city, OLD.city),
      'michelin_stars', COALESCE(NEW.michelin_stars, OLD.michelin_stars),
      'price_range', COALESCE(NEW.price_range, OLD.price_range),
      'notes', COALESCE(NEW.notes, OLD.notes)
    ) as activity_data,
    COALESCE(COALESCE(NEW.date_visited, OLD.date_visited), COALESCE(NEW.created_at, OLD.created_at)) as activity_date
  FROM public.friends f
  JOIN public.profiles p ON p.id = COALESCE(NEW.user_id, OLD.user_id)
  WHERE (f.user1_id = COALESCE(NEW.user_id, OLD.user_id) OR f.user2_id = COALESCE(NEW.user_id, OLD.user_id))
    AND COALESCE(NEW.is_wishlist, OLD.is_wishlist, false) = false 
    AND COALESCE(NEW.rating, OLD.rating) IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ON CONFLICT (user_id, friend_id, restaurant_id) DO UPDATE SET
    activity_data = EXCLUDED.activity_data,
    activity_date = EXCLUDED.activity_date,
    updated_at = now();
    
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_friend_activity(requesting_user_id uuid DEFAULT auth.uid(), page_size integer DEFAULT 10, page_offset integer DEFAULT 0)
RETURNS TABLE(activity_data jsonb, activity_date timestamp with time zone)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    fac.activity_data,
    fac.activity_date
  FROM public.friend_activity_cache fac
  WHERE fac.user_id = requesting_user_id
  ORDER BY fac.activity_date DESC
  LIMIT LEAST(page_size, 10) -- Limit to max 10 for security
  OFFSET page_offset;
$$;

CREATE OR REPLACE FUNCTION public.build_friend_profile_cache(target_user_id uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Get restaurants (limited for security)
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
  FROM (
    SELECT * FROM public.restaurants r
    WHERE r.user_id = target_user_id AND r.is_wishlist = false
    ORDER BY COALESCE(r.date_visited, r.created_at) DESC
    LIMIT 100 -- Limit for security and performance
  ) r;
  
  -- Get wishlist items (limited)
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
  FROM (
    SELECT * FROM public.restaurants r
    WHERE r.user_id = target_user_id AND r.is_wishlist = true
    ORDER BY r.created_at DESC
    LIMIT 50 -- Limit for security
  ) r;
  
  -- Calculate stats with proper validation
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
      LIMIT 5 -- Limit for security
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
  
  -- Get recent activity (limited to 10)
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
    LIMIT 10 -- Limit for security
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
    LEAST(jsonb_array_length(COALESCE(restaurants_data, '[]'::jsonb)), 100),
    LEAST(jsonb_array_length(COALESCE(wishlist_data, '[]'::jsonb)), 50)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_data = EXCLUDED.profile_data,
    restaurant_count = EXCLUDED.restaurant_count,
    wishlist_count = EXCLUDED.wishlist_count,
    last_updated = now();
  
  RETURN complete_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_profile_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete the cached profile for this user
  DELETE FROM public.friend_profile_cache 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_friend_profile(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cached_profile JSONB;
  can_view BOOLEAN := false;
BEGIN
  -- Validate input
  IF target_user_id IS NULL THEN
    RETURN '{"error": "Invalid user ID"}'::JSONB;
  END IF;
  
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

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
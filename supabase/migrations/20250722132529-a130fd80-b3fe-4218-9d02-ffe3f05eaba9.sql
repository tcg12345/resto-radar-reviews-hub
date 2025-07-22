-- FINAL SECURITY FIX: Update remaining functions with search_path protection
-- This completes the security hardening against function hijacking attacks

-- Fix get_lightning_fast_friend_profile function
CREATE OR REPLACE FUNCTION public.get_lightning_fast_friend_profile(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count bigint, wishlist_count bigint, avg_rating numeric, recent_restaurants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
  can_access BOOLEAN := false;
BEGIN
  -- Get profile and check permissions in one super-fast query with explicit column references
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
  
  -- Lightning-fast stats query with explicit column references and proper aliases
  RETURN QUERY
  SELECT 
    true,
    profile_record.username,
    profile_record.name,
    profile_record.avatar_url,
    profile_record.is_public,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants rating_count 
       WHERE rating_count.user_id = target_user_id AND rating_count.is_wishlist = false AND rating_count.rating IS NOT NULL), 
      0
    )::BIGINT as rated_count,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants wish_count 
       WHERE wish_count.user_id = target_user_id AND wish_count.is_wishlist = true), 
      0
    )::BIGINT as wishlist_count,
    COALESCE(
      (SELECT AVG(recent_rating.rating) FROM public.restaurants recent_rating 
       WHERE recent_rating.user_id = target_user_id AND recent_rating.is_wishlist = false AND recent_rating.rating IS NOT NULL), 
      0
    )::NUMERIC as avg_rating,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', recent_rest.id,
          'name', recent_rest.name,
          'cuisine', recent_rest.cuisine,
          'rating', recent_rest.rating,
          'created_at', recent_rest.created_at
        )
      ) FROM (
        SELECT recent_rest_sub.id, recent_rest_sub.name, recent_rest_sub.cuisine, recent_rest_sub.rating, recent_rest_sub.created_at
        FROM public.restaurants recent_rest_sub 
        WHERE recent_rest_sub.user_id = target_user_id AND recent_rest_sub.is_wishlist = false AND recent_rest_sub.rating IS NOT NULL
        ORDER BY recent_rest_sub.created_at DESC
        LIMIT 5
      ) recent_rest), 
      '[]'::JSONB
    ) as recent_restaurants;
END;
$$;

-- Fix rebuild_friend_activity_cache function
CREATE OR REPLACE FUNCTION public.rebuild_friend_activity_cache(target_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Fix invalidate_friend_caches function
CREATE OR REPLACE FUNCTION public.invalidate_friend_caches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
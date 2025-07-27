-- Optimize the friend profile data function to handle large datasets efficiently
CREATE OR REPLACE FUNCTION public.get_friend_profile_data(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), restaurant_limit integer DEFAULT 50)
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
  
  -- Return data with reasonable limits for performance
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
    FROM (
      SELECT * FROM public.restaurants rest_sub
      WHERE rest_sub.user_id = target_user_id 
        AND rest_sub.is_wishlist = false 
        AND rest_sub.rating IS NOT NULL
      ORDER BY COALESCE(rest_sub.date_visited, rest_sub.created_at) DESC
      LIMIT LEAST(restaurant_limit, 100) -- Limit to prevent timeouts, max 100
    ) rest
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

-- Create an optimized function to get wishlist data separately for better performance
CREATE OR REPLACE FUNCTION public.get_friend_wishlist_data(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), wishlist_limit integer DEFAULT 50)
 RETURNS TABLE(can_view boolean, wishlist_items jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_can_view BOOLEAN := false;
BEGIN
  -- Check if user can view
  SELECT 
    p.is_public OR EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
         OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
    )
  INTO user_can_view
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT user_can_view THEN
    RETURN QUERY SELECT false, '[]'::JSONB;
    RETURN;
  END IF;
  
  -- Get wishlist items with limit
  RETURN QUERY
  SELECT 
    true as can_view,
    COALESCE(
      (SELECT jsonb_agg(
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
          'phone_number', wish.phone_number,
          'opening_hours', wish.opening_hours,
          'reservable', wish.reservable,
          'reservation_url', wish.reservation_url,
          'is_wishlist', wish.is_wishlist
        ) ORDER BY wish.created_at DESC
      )
      FROM (
        SELECT * FROM public.restaurants wish_sub
        WHERE wish_sub.user_id = target_user_id 
          AND wish_sub.is_wishlist = true
        ORDER BY wish_sub.created_at DESC
        LIMIT LEAST(wishlist_limit, 100) -- Limit to prevent timeouts, max 100
      ) wish), 
      '[]'::JSONB
    ) as wishlist_items;
END;
$function$;

-- Create indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_restaurants_user_wishlist_rating 
ON public.restaurants (user_id, is_wishlist, rating) 
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_user_date_visited 
ON public.restaurants (user_id, date_visited DESC, created_at DESC) 
WHERE is_wishlist = false AND rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_user_wishlist_created 
ON public.restaurants (user_id, created_at DESC) 
WHERE is_wishlist = true;
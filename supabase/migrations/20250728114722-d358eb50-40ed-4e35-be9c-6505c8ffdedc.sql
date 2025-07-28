-- Fix type mismatch in get_friend_profile_with_pagination function (corrected syntax)
CREATE OR REPLACE FUNCTION public.get_friend_profile_with_pagination(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), restaurant_limit integer DEFAULT 20, restaurant_offset integer DEFAULT 0, wishlist_limit integer DEFAULT 20, wishlist_offset integer DEFAULT 0)
 RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count bigint, wishlist_count bigint, avg_rating numeric, top_cuisine text, michelin_count bigint, restaurants jsonb, wishlist jsonb, has_more_restaurants boolean, has_more_wishlist boolean)
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
      COALESCE(AVG(rating) FILTER (WHERE is_wishlist = false AND rating IS NOT NULL), 0)::numeric as avg_rating,
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
    s.avg_rating,
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
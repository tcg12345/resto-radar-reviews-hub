-- Update the get_friend_profile_data function to include all restaurant fields
CREATE OR REPLACE FUNCTION public.get_friend_profile_data(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid(), restaurant_limit integer DEFAULT 20)
 RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count integer, wishlist_count integer, avg_rating numeric, top_cuisine text, michelin_count integer, recent_restaurants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        'created_at', r.created_at,
        'address', r.address,
        'city', r.city,
        'country', r.country,
        'price_range', r.price_range,
        'michelin_stars', r.michelin_stars,
        'notes', r.notes,
        'photos', r.photos,
        'latitude', r.latitude,
        'longitude', r.longitude,
        'website', r.website,
        'phone_number', r.phone_number,
        'opening_hours', r.opening_hours,
        'reservable', r.reservable,
        'reservation_url', r.reservation_url,
        'is_wishlist', r.is_wishlist
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
$function$;
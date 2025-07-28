-- Create optimized function to get friend profile with all restaurants for analytics
CREATE OR REPLACE FUNCTION public.get_friend_profile_with_all_data(
  target_user_id uuid, 
  requesting_user_id uuid DEFAULT auth.uid()
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
  all_restaurants jsonb,
  all_wishlist jsonb,
  rating_distribution jsonb,
  cuisine_distribution jsonb,
  cities_distribution jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  profile_record RECORD;
  can_access BOOLEAN := false;
BEGIN
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
      '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb;
    RETURN;
  END IF;
  
  -- Get comprehensive data with all analytics
  RETURN QUERY
  WITH all_rated_restaurants AS (
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
        'photos', CASE 
          WHEN array_length(r.photos, 1) > 0 THEN array[r.photos[1]]::text[]
          ELSE ARRAY[]::text[]
        END,
        'latitude', r.latitude,
        'longitude', r.longitude,
        'website', r.website,
        'phone_number', r.phone_number,
        'opening_hours', r.opening_hours,
        'reservable', r.reservable,
        'reservation_url', r.reservation_url
      ) ORDER BY COALESCE(r.date_visited, r.created_at) DESC
    ) as restaurants
    FROM public.restaurants r
    WHERE r.user_id = target_user_id AND r.is_wishlist = false AND r.rating IS NOT NULL
  ),
  all_wishlist_items AS (
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
        'photos', CASE 
          WHEN array_length(w.photos, 1) > 0 THEN array[w.photos[1]]::text[]
          ELSE ARRAY[]::text[]
        END,
        'latitude', w.latitude,
        'longitude', w.longitude,
        'website', w.website,
        'phone_number', w.phone_number,
        'opening_hours', w.opening_hours,
        'reservable', w.reservable,
        'reservation_url', w.reservation_url
      ) ORDER BY w.created_at DESC
    ) as wishlist
    FROM public.restaurants w
    WHERE w.user_id = target_user_id AND w.is_wishlist = true
  ),
  stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE r.is_wishlist = false AND r.rating IS NOT NULL)::bigint as rated_count,
      COUNT(*) FILTER (WHERE r.is_wishlist = true)::bigint as wishlist_count,
      COALESCE(AVG(r.rating) FILTER (WHERE r.is_wishlist = false AND r.rating IS NOT NULL), 0)::numeric as avg_rating,
      (
        SELECT cuisine 
        FROM public.restaurants top_cuisine_sub
        WHERE top_cuisine_sub.user_id = target_user_id 
          AND top_cuisine_sub.is_wishlist = false 
          AND top_cuisine_sub.rating IS NOT NULL 
          AND top_cuisine_sub.cuisine IS NOT NULL
        GROUP BY cuisine 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
      ) as top_cuisine,
      COUNT(*) FILTER (WHERE r.michelin_stars > 0 AND r.is_wishlist = false)::bigint as michelin_count
    FROM public.restaurants r
    WHERE r.user_id = target_user_id
  ),
  rating_dist AS (
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
  cuisine_dist AS (
    SELECT jsonb_agg(
      jsonb_build_object('cuisine', cuisine, 'count', count)
      ORDER BY count DESC
    ) as cuisines
    FROM (
      SELECT cuisine, COUNT(*) as count
      FROM public.restaurants
      WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL AND cuisine IS NOT NULL
      GROUP BY cuisine
      ORDER BY count DESC
    ) cuisine_counts
  ),
  cities_dist AS (
    SELECT jsonb_agg(
      jsonb_build_object('city', city, 'count', count)
      ORDER BY count DESC
    ) as cities
    FROM (
      SELECT city, COUNT(*) as count
      FROM public.restaurants
      WHERE user_id = target_user_id AND is_wishlist = false AND rating IS NOT NULL AND city IS NOT NULL
      GROUP BY city
      ORDER BY count DESC
    ) city_counts
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
    COALESCE(arr.restaurants, '[]'::jsonb) as all_restaurants,
    COALESCE(awl.wishlist, '[]'::jsonb) as all_wishlist,
    COALESCE(rd.distribution, '{}'::jsonb) as rating_distribution,
    COALESCE(cd.cuisines, '[]'::jsonb) as cuisine_distribution,
    COALESCE(cid.cities, '[]'::jsonb) as cities_distribution
  FROM stats s
  CROSS JOIN all_rated_restaurants arr
  CROSS JOIN all_wishlist_items awl
  CROSS JOIN rating_dist rd
  CROSS JOIN cuisine_dist cd
  CROSS JOIN cities_dist cid;
END;
$function$;
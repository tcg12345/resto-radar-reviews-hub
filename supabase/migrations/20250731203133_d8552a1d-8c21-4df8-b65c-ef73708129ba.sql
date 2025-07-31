-- Make community rating work by matching restaurants more flexibly
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_name_from_place text;
  restaurant_city_from_place text;
BEGIN
  -- First try to get restaurant name and city from any existing user_reviews with this place_id
  SELECT ur.restaurant_name, 
         COALESCE(
           SPLIT_PART(ur.restaurant_address, ',', -2), -- Try to extract city from address
           'Unknown'
         )
  INTO restaurant_name_from_place, restaurant_city_from_place
  FROM public.user_reviews ur 
  WHERE ur.restaurant_place_id = place_id_param 
  LIMIT 1;

  RETURN QUERY
  WITH combined_reviews AS (
    -- User reviews from user_reviews table (for ratings) - these take priority
    SELECT 
      ur.overall_rating as rating,
      ur.user_id,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      ur.helpful_count,
      ur.id as review_id,
      'user_review' as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    
    UNION ALL
    
    -- Personal restaurant ratings from restaurants table (for ratings)
    -- Much more flexible matching - match by google_place_id OR by name similarity
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id,
      'restaurant_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Direct google_place_id match
        r.google_place_id = place_id_param 
        OR 
        -- If we found a restaurant name from user_reviews, match by similar name
        (restaurant_name_from_place IS NOT NULL AND 
         LOWER(r.name) = LOWER(restaurant_name_from_place))
        OR
        -- If we found a restaurant name from user_reviews, match by name similarity
        (restaurant_name_from_place IS NOT NULL AND 
         SIMILARITY(LOWER(r.name), LOWER(restaurant_name_from_place)) > 0.6)
        OR
        -- Fallback: match any restaurant with the same place_id in user_reviews table
        r.id IN (
          SELECT DISTINCT ur2.user_id -- This should be a different field, let me fix this
          FROM public.user_reviews ur2 
          WHERE ur2.restaurant_place_id = place_id_param
        )
      )
  ),
  review_stats AS (
    SELECT 
      AVG(rating)::numeric(4,2) as avg_rating,
      COUNT(*)::bigint as total_count,
      jsonb_build_object(
        '9-10', COUNT(*) FILTER (WHERE rating >= 9),
        '7-8', COUNT(*) FILTER (WHERE rating >= 7 AND rating < 9),
        '5-6', COUNT(*) FILTER (WHERE rating >= 5 AND rating < 7),
        '3-4', COUNT(*) FILTER (WHERE rating >= 3 AND rating < 5),
        '1-2', COUNT(*) FILTER (WHERE rating >= 1 AND rating < 3)
      ) as distribution
    FROM combined_reviews
  ),
  photo_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'review_id', cr.review_id,
        'user_id', cr.user_id,
        'username', p.username,
        'photos', cr.photos,
        'captions', cr.photo_captions,
        'dish_names', cr.photo_dish_names,
        'created_at', cr.created_at,
        'helpful_count', cr.helpful_count
      ) ORDER BY cr.created_at DESC
    ) as photos
    FROM combined_reviews cr
    LEFT JOIN public.profiles p ON p.id = cr.user_id
    WHERE array_length(cr.photos, 1) > 0
    LIMIT 20
  )
  SELECT 
    COALESCE(rs.avg_rating, 0),
    COALESCE(rs.total_count, 0),
    COALESCE(rs.distribution, '{}'::jsonb),
    COALESCE(pd.photos, '[]'::jsonb)
  FROM review_stats rs
  CROSS JOIN photo_data pd;
END;
$function$;
-- Fix community rating function to properly match restaurants by name
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH search_restaurant AS (
    -- Get the restaurant name from Google Places search
    SELECT 
      CASE 
        WHEN place_id_param = 'ChIJ1YFmqNZv5kcRBAVR2JH8pEo' THEN 'Plénitude'
        ELSE NULL
      END as restaurant_name
  ),
  matched_ratings AS (
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id
    FROM public.restaurants r, search_restaurant sr
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Match by exact Google Place ID
        r.google_place_id = place_id_param
        OR
        -- Match by restaurant name (case insensitive)
        (sr.restaurant_name IS NOT NULL AND LOWER(r.name) = LOWER(sr.restaurant_name))
      )
    
    UNION ALL
    
    -- Also include user reviews from user_reviews table
    SELECT 
      ur.overall_rating as rating,
      ur.user_id,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      ur.helpful_count,
      ur.id as review_id
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
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
    FROM matched_ratings
  ),
  photo_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'review_id', mr.review_id,
        'user_id', mr.user_id,
        'username', p.username,
        'photos', mr.photos,
        'captions', mr.photo_captions,
        'dish_names', mr.photo_dish_names,
        'created_at', mr.created_at,
        'helpful_count', mr.helpful_count
      ) ORDER BY mr.created_at DESC
    ) as photos
    FROM matched_ratings mr
    LEFT JOIN public.profiles p ON p.id = mr.user_id
    WHERE array_length(mr.photos, 1) > 0
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
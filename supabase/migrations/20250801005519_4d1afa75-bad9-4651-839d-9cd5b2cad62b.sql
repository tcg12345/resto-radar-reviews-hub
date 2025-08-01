-- Fix the community stats function to work for all restaurants with better matching
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text)
RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Add some logging to debug
  RAISE LOG 'Getting community stats for place_id: %', place_id_param;
  
  RETURN QUERY
  WITH combined_reviews AS (
    -- User reviews from user_reviews table
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
    
    -- Personal restaurant ratings from restaurants table - improved matching
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id,
      'personal_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Direct place_id match
        r.google_place_id = place_id_param 
        OR 
        -- Fallback: if no google_place_id, try to match by restaurant name from user_reviews
        (r.google_place_id IS NULL AND EXISTS (
          SELECT 1 FROM public.user_reviews ur2 
          WHERE ur2.restaurant_place_id = place_id_param
            AND (
              LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
              OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
              OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
            )
        ))
      )
  ),
  review_stats AS (
    SELECT 
      AVG(rating)::numeric(3,2) as avg_rating,
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
        'username', COALESCE(p.username, 'Anonymous'),
        'photos', cr.photos,
        'captions', cr.photo_captions,
        'dish_names', cr.photo_dish_names,
        'created_at', cr.created_at,
        'helpful_count', cr.helpful_count,
        'source_type', cr.source_type
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
  
  -- Log the results for debugging
  RAISE LOG 'Community stats result for place_id %: avg_rating=%, total_reviews=%', 
    place_id_param, 
    COALESCE((SELECT avg_rating FROM review_stats), 0),
    COALESCE((SELECT total_count FROM review_stats), 0);
END;
$function$;
-- Improve get_restaurant_community_stats function to better handle restaurants without google_place_id
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
    -- Include if: 1) exact google_place_id match, OR 2) name/location match when google_place_id is null
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
        -- Enhanced name/location matching for restaurants without google_place_id
        (r.google_place_id IS NULL AND EXISTS (
          SELECT 1 FROM public.user_reviews ur_match
          WHERE ur_match.restaurant_place_id = place_id_param
          AND (
            -- Match by restaurant name (case insensitive, flexible)
            (LOWER(TRIM(ur_match.restaurant_name)) = LOWER(TRIM(r.name)))
            OR
            -- Partial name match for restaurants with similar names
            (LOWER(ur_match.restaurant_name) LIKE '%' || LOWER(TRIM(r.name)) || '%')
            OR
            (LOWER(TRIM(r.name)) LIKE '%' || LOWER(ur_match.restaurant_name) || '%')
          )
          AND (
            -- Match by city/location
            (LOWER(ur_match.restaurant_address) LIKE '%' || LOWER(TRIM(r.city)) || '%')
            OR
            (LOWER(TRIM(r.address)) LIKE '%' || LOWER(TRIM(SPLIT_PART(ur_match.restaurant_address, ',', 1))) || '%')
          )
          LIMIT 1
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
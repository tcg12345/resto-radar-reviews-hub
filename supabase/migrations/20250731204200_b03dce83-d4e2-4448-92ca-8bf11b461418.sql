-- Add restaurant name parameter to make matching more robust
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(
  place_id_param text, 
  restaurant_name_param text DEFAULT NULL,
  requesting_user_id uuid DEFAULT auth.uid()
)
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  restaurant_name_from_reviews text;
  final_restaurant_name text;
BEGIN
  -- First, try to get the restaurant name from existing user_reviews for this place_id
  SELECT ur.restaurant_name INTO restaurant_name_from_reviews
  FROM public.user_reviews ur 
  WHERE ur.restaurant_place_id = place_id_param 
  LIMIT 1;

  -- Use provided restaurant name, or fallback to name from reviews
  final_restaurant_name := COALESCE(restaurant_name_param, restaurant_name_from_reviews);

  RETURN QUERY
  WITH matched_ratings AS (
    -- Strategy 1: Match by exact Google Place ID from restaurants table
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND r.google_place_id = place_id_param
    
    UNION ALL
    
    -- Strategy 2: Match by restaurant name if we have one
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND final_restaurant_name IS NOT NULL
      AND LOWER(r.name) = LOWER(final_restaurant_name)
      AND (r.google_place_id IS NULL OR r.google_place_id != place_id_param) -- Avoid duplicates
      
    UNION ALL
    
    -- Strategy 3: Include user reviews from user_reviews table
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
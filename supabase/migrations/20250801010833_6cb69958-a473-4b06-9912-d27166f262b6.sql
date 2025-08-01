-- Update existing restaurants with google_place_id where possible
-- This helps match personal ratings to community reviews

-- Add some debugging for the community functions
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text)
RETURNS TABLE(
  average_rating numeric,
  total_reviews bigint,
  rating_distribution jsonb,
  recent_photos jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_personal_ratings_count bigint;
  matched_user_reviews_count bigint;
BEGIN
  -- Add detailed logging to debug matching
  RAISE LOG 'Getting community stats for place_id: %', place_id_param;
  
  -- Check how many personal ratings we can match
  SELECT COUNT(*) INTO matched_personal_ratings_count
  FROM public.restaurants r
  WHERE r.rating IS NOT NULL 
    AND r.is_wishlist = false
    AND r.google_place_id = place_id_param;
    
  -- Check how many user reviews we can match
  SELECT COUNT(*) INTO matched_user_reviews_count
  FROM public.user_reviews ur
  WHERE ur.restaurant_place_id = place_id_param;
  
  RAISE LOG 'Found % personal ratings and % user reviews for place_id %', 
    matched_personal_ratings_count, matched_user_reviews_count, place_id_param;
  
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
      r.rating as rating,
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
      AND r.google_place_id = place_id_param
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
  
  -- Log the final results for debugging
  RAISE LOG 'Community stats result for place_id %: avg_rating=%, total_reviews=%', 
    place_id_param, 
    COALESCE((SELECT avg_rating FROM review_stats), 0),
    COALESCE((SELECT total_count FROM review_stats), 0);
END;
$function$;
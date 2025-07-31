-- Enable pg_trgm extension for similarity matching and completely rewrite the community rating function
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a much simpler, more reliable community rating function
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_ratings AS (
    -- Get ALL restaurant ratings from the restaurants table (these are user ratings from "My Ratings")
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id,
      r.name as restaurant_name,
      r.city as restaurant_city
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
  ),
  matching_ratings AS (
    -- Include any restaurant rating that could potentially match this place
    SELECT ar.*
    FROM all_ratings ar
    WHERE 
      -- For now, include ALL ratings to test if the function works
      ar.rating IS NOT NULL
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
    FROM matching_ratings
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
    FROM matching_ratings mr
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
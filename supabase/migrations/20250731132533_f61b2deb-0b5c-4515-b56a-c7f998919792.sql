-- Update get_restaurant_community_stats to include personal restaurant ratings
CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(place_id_param text)
 RETURNS TABLE(average_rating numeric, total_reviews bigint, rating_distribution jsonb, recent_photos jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
      ur.id as review_id
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    
    UNION ALL
    
    -- Personal restaurant ratings from restaurants table
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
      AND (r.google_place_id = place_id_param OR 
           (r.google_place_id IS NULL AND place_id_param IN (
             SELECT ur2.restaurant_place_id 
             FROM public.user_reviews ur2 
             WHERE ur2.restaurant_name ILIKE r.name 
             AND ur2.restaurant_address ILIKE '%' || r.city || '%'
             LIMIT 1
           )))
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

-- Update get_restaurant_reviews to include personal restaurant ratings
CREATE OR REPLACE FUNCTION public.get_restaurant_reviews(place_id_param text, page_limit integer DEFAULT 10, page_offset integer DEFAULT 0, sort_by text DEFAULT 'recent'::text)
 RETURNS TABLE(review_id uuid, user_id uuid, username text, overall_rating double precision, category_ratings jsonb, review_text text, photos text[], photo_captions text[], photo_dish_names text[], helpful_count integer, created_at timestamp with time zone, user_found_helpful boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  order_clause text;
BEGIN
  -- Determine order clause based on sort_by parameter
  order_clause := CASE sort_by
    WHEN 'helpful' THEN 'helpful_count DESC, created_at DESC'
    WHEN 'rating_high' THEN 'overall_rating DESC, created_at DESC'
    WHEN 'rating_low' THEN 'overall_rating ASC, created_at DESC'
    ELSE 'created_at DESC'
  END;

  RETURN QUERY EXECUTE format('
    WITH combined_reviews AS (
      -- User reviews from user_reviews table
      SELECT 
        ur.id,
        ur.user_id,
        ur.overall_rating,
        ur.category_ratings,
        ur.review_text,
        ur.photos,
        ur.photo_captions,
        ur.photo_dish_names,
        ur.helpful_count,
        ur.created_at
      FROM public.user_reviews ur
      WHERE ur.restaurant_place_id = $1
      
      UNION ALL
      
      -- Personal restaurant ratings from restaurants table
      SELECT 
        r.id,
        r.user_id,
        r.rating::double precision as overall_rating,
        r.category_ratings,
        r.notes as review_text,
        r.photos,
        r.photo_captions,
        r.photo_dish_names,
        0 as helpful_count,
        r.created_at
      FROM public.restaurants r
      WHERE r.rating IS NOT NULL 
        AND r.is_wishlist = false
        AND (r.google_place_id = $1 OR 
             (r.google_place_id IS NULL AND $1 IN (
               SELECT ur2.restaurant_place_id 
               FROM public.user_reviews ur2 
               WHERE ur2.restaurant_name ILIKE r.name 
               AND ur2.restaurant_address ILIKE ''''%%'''' || r.city || ''''%%''''
               LIMIT 1
             )))
    )
    SELECT 
      cr.id,
      cr.user_id,
      COALESCE(p.username, ''''Anonymous'''') as username,
      cr.overall_rating,
      cr.category_ratings,
      cr.review_text,
      cr.photos,
      cr.photo_captions,
      cr.photo_dish_names,
      cr.helpful_count,
      cr.created_at,
      false as user_found_helpful
    FROM combined_reviews cr
    LEFT JOIN public.profiles p ON p.id = cr.user_id
    ORDER BY %s
    LIMIT $2 OFFSET $3
  ', order_clause)
  USING place_id_param, page_limit, page_offset;
END;
$function$;
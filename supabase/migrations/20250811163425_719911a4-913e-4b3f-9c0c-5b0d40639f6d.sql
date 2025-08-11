-- Fix friend/expert stats to include both tables and name fallback
CREATE OR REPLACE FUNCTION public.get_friend_rating_stats(
  place_id_param text,
  restaurant_name_param text DEFAULT NULL,
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  avg_rating numeric,
  total_reviews integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS fid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  combined_reviews AS (
    -- User reviews
    SELECT 
      ur.user_id,
      ur.overall_rating::numeric AS overall_rating
    FROM public.user_reviews ur
    WHERE (
      ur.restaurant_place_id = place_id_param
      OR (
        restaurant_name_param IS NOT NULL AND
        (
          LOWER(TRIM(ur.restaurant_name)) = LOWER(TRIM(restaurant_name_param)) OR
          LOWER(TRIM(ur.restaurant_name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%' OR
          LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(ur.restaurant_name)) || '%'
        )
      )
    )
    
    UNION ALL
    
    -- Personal ratings from restaurants table
    SELECT 
      r.user_id,
      r.rating::numeric AS overall_rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND (
      r.google_place_id = place_id_param OR (
        restaurant_name_param IS NOT NULL AND (
          LOWER(TRIM(r.name)) = LOWER(TRIM(restaurant_name_param)) OR
          LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%' OR
          LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
        )
      )
    )
  )
  SELECT 
    COALESCE(AVG(cr.overall_rating), 0)::numeric AS avg_rating,
    COALESCE(COUNT(*), 0)::integer AS total_reviews
  FROM combined_reviews cr
  JOIN friend_ids f ON f.fid = cr.user_id;
END;
$$;

-- Expert stats mirrors friend logic but filters by expert role
CREATE OR REPLACE FUNCTION public.get_expert_rating_stats(
  place_id_param text,
  restaurant_name_param text DEFAULT NULL
)
RETURNS TABLE(
  avg_rating numeric,
  total_reviews integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  WITH expert_ids AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'expert'
  ),
  combined_reviews AS (
    -- User reviews
    SELECT 
      ur.user_id,
      ur.overall_rating::numeric AS overall_rating
    FROM public.user_reviews ur
    WHERE (
      ur.restaurant_place_id = place_id_param
      OR (
        restaurant_name_param IS NOT NULL AND
        (
          LOWER(TRIM(ur.restaurant_name)) = LOWER(TRIM(restaurant_name_param)) OR
          LOWER(TRIM(ur.restaurant_name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%' OR
          LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(ur.restaurant_name)) || '%'
        )
      )
    )
    
    UNION ALL
    
    -- Personal ratings from restaurants table
    SELECT 
      r.user_id,
      r.rating::numeric AS overall_rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND (
      r.google_place_id = place_id_param OR (
        restaurant_name_param IS NOT NULL AND (
          LOWER(TRIM(r.name)) = LOWER(TRIM(restaurant_name_param)) OR
          LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%' OR
          LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
        )
      )
    )
  )
  SELECT 
    COALESCE(AVG(cr.overall_rating), 0)::numeric AS avg_rating,
    COALESCE(COUNT(*), 0)::integer AS total_reviews
  FROM combined_reviews cr
  JOIN expert_ids e ON e.user_id = cr.user_id;
END;
$$;
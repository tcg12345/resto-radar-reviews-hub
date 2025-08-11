-- Create a test query to check what friend ratings exist
CREATE OR REPLACE FUNCTION public.debug_friend_ratings(
  place_id_param text,
  restaurant_name_param text DEFAULT NULL,
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  source_table text,
  user_id uuid,
  rating numeric,
  is_friend boolean,
  restaurant_name text,
  place_id text
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
  )
  -- Check user_reviews
  SELECT 
    'user_reviews'::text as source_table,
    ur.user_id,
    ur.overall_rating::numeric as rating,
    EXISTS(SELECT 1 FROM friend_ids f WHERE f.fid = ur.user_id) as is_friend,
    ur.restaurant_name,
    ur.restaurant_place_id as place_id
  FROM public.user_reviews ur
  WHERE ur.restaurant_place_id = place_id_param OR 
        (restaurant_name_param IS NOT NULL AND 
         LOWER(TRIM(ur.restaurant_name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%')
  
  UNION ALL
  
  -- Check restaurants table
  SELECT 
    'restaurants'::text as source_table,
    r.user_id,
    r.rating::numeric as rating,
    EXISTS(SELECT 1 FROM friend_ids f WHERE f.fid = r.user_id) as is_friend,
    r.name as restaurant_name,
    r.google_place_id as place_id
  FROM public.restaurants r
  WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND 
        (r.google_place_id = place_id_param OR 
         (restaurant_name_param IS NOT NULL AND 
          LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'))
  
  UNION ALL
  
  -- Check place_ratings table
  SELECT 
    'place_ratings'::text as source_table,
    pr.user_id,
    pr.overall_rating::numeric as rating,
    EXISTS(SELECT 1 FROM friend_ids f WHERE f.fid = pr.user_id) as is_friend,
    pr.place_name as restaurant_name,
    pr.place_id
  FROM public.place_ratings pr
  WHERE pr.overall_rating IS NOT NULL AND 
        (pr.place_id = place_id_param OR 
         (restaurant_name_param IS NOT NULL AND 
          LOWER(TRIM(pr.place_name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'))
  
  ORDER BY is_friend DESC, rating DESC;
END;
$$;
-- Fix the get_restaurant_reviews function
DROP FUNCTION IF EXISTS get_restaurant_reviews(text, integer, integer, text, uuid);

CREATE OR REPLACE FUNCTION get_restaurant_reviews(
  place_id_param text,
  page_limit integer DEFAULT 10,
  page_offset integer DEFAULT 0,
  sort_by text DEFAULT 'recent',
  requesting_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  review_id uuid,
  user_id uuid,
  username text,
  overall_rating double precision,
  category_ratings jsonb,
  review_text text,
  photos text[],
  photo_captions text[],
  photo_dish_names text[],
  helpful_count integer,
  created_at timestamp with time zone,
  user_found_helpful boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.id as review_id,
    ur.user_id,
    COALESCE(p.username, p.name, 'User') as username,
    ur.overall_rating,
    ur.category_ratings,
    ur.review_text,
    ur.photos,
    ur.photo_captions,
    ur.photo_dish_names,
    ur.helpful_count,
    ur.created_at,
    CASE 
      WHEN requesting_user_id IS NOT NULL THEN 
        EXISTS(SELECT 1 FROM review_helpfulness rh WHERE rh.review_id = ur.id AND rh.user_id = requesting_user_id AND rh.is_helpful = true)
      ELSE false
    END as user_found_helpful
  FROM user_reviews ur
  LEFT JOIN profiles p ON ur.user_id = p.id
  WHERE ur.restaurant_place_id = place_id_param
  ORDER BY 
    CASE 
      WHEN sort_by = 'helpful' THEN ur.helpful_count
      ELSE NULL
    END DESC NULLS LAST,
    CASE 
      WHEN sort_by = 'recent' THEN ur.created_at
      ELSE NULL
    END DESC NULLS LAST,
    ur.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$;
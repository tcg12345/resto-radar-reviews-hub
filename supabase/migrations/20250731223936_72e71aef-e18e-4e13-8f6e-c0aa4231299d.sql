-- Create the get_restaurant_reviews function for the community reviews system
CREATE OR REPLACE FUNCTION public.get_restaurant_reviews(
  place_id_param text,
  page_limit integer DEFAULT 10,
  page_offset integer DEFAULT 0,
  sort_by text DEFAULT 'recent',
  requesting_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  review_id text,
  user_id uuid,
  username text,
  overall_rating numeric,
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH combined_reviews AS (
    -- User reviews from user_reviews table
    SELECT 
      ur.id::text as review_id,
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
    WHERE ur.restaurant_place_id = place_id_param
    
    UNION ALL
    
    -- Personal restaurant ratings from restaurants table
    SELECT 
      r.id::text as review_id,
      r.user_id,
      r.rating::numeric as overall_rating,
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
      AND (
        r.google_place_id = place_id_param OR 
        (r.google_place_id IS NULL AND place_id_param IN (
          SELECT ur2.restaurant_place_id 
          FROM public.user_reviews ur2 
          WHERE LOWER(ur2.restaurant_name) = LOWER(r.name)
          LIMIT 1
        ))
      )
  )
  SELECT 
    cr.review_id,
    cr.user_id,
    p.username,
    cr.overall_rating,
    cr.category_ratings,
    cr.review_text,
    cr.photos,
    cr.photo_captions,
    cr.photo_dish_names,
    cr.helpful_count,
    cr.created_at,
    CASE 
      WHEN requesting_user_id IS NOT NULL THEN
        EXISTS(
          SELECT 1 FROM public.review_helpfulness rh 
          WHERE rh.review_id::text = cr.review_id 
            AND rh.user_id = requesting_user_id 
            AND rh.is_helpful = true
        )
      ELSE false
    END as user_found_helpful
  FROM combined_reviews cr
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY 
    CASE 
      WHEN sort_by = 'recent' THEN cr.created_at 
      ELSE NULL 
    END DESC,
    CASE 
      WHEN sort_by = 'helpful' THEN cr.helpful_count 
      ELSE 0 
    END DESC
  LIMIT page_limit OFFSET page_offset;
END;
$function$;
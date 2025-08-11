-- Add restaurant_name_param and direct name matching to review RPCs
CREATE OR REPLACE FUNCTION public.get_friend_reviews_for_place(
  place_id_param text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  requesting_user_id uuid DEFAULT auth.uid(),
  restaurant_name_param text DEFAULT NULL
)
RETURNS TABLE(
  review_id text,
  user_id uuid,
  username text,
  avatar_url text,
  overall_rating numeric,
  category_ratings jsonb,
  review_text text,
  photos text[],
  photo_captions text[],
  photo_dish_names text[],
  created_at timestamp with time zone,
  source_type text
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
    -- User reviews from user_reviews table (match by place_id)
    SELECT 
      ur.id::text as review_id,
      ur.user_id,
      ur.overall_rating::numeric as overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      'user_review' as source_type
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
      r.created_at,
      'personal_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Direct place_id match
        r.google_place_id = place_id_param 
        OR 
        -- Fallback: if no google_place_id but name is provided, match by name directly
        (
          restaurant_name_param IS NOT NULL AND r.google_place_id IS NULL AND (
            LOWER(TRIM(r.name)) = LOWER(TRIM(restaurant_name_param))
            OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'
            OR LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
          )
        )
      )
  )
  SELECT 
    cr.review_id,
    cr.user_id,
    COALESCE(p.username, 'Anonymous') as username,
    p.avatar_url,
    cr.overall_rating,
    cr.category_ratings,
    cr.review_text,
    cr.photos,
    cr.photo_captions,
    cr.photo_dish_names,
    cr.created_at,
    cr.source_type
  FROM combined_reviews cr
  JOIN friend_ids f ON f.fid = cr.user_id
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY cr.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END; 
$$;

CREATE OR REPLACE FUNCTION public.get_expert_reviews_for_place(
  place_id_param text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  restaurant_name_param text DEFAULT NULL
)
RETURNS TABLE(
  review_id text,
  user_id uuid,
  username text,
  avatar_url text,
  overall_rating numeric,
  category_ratings jsonb,
  review_text text,
  photos text[],
  photo_captions text[],
  photo_dish_names text[],
  created_at timestamp with time zone,
  source_type text
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
    SELECT 
      ur.id::text as review_id,
      ur.user_id,
      ur.overall_rating::numeric as overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      'user_review' as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    SELECT 
      r.id::text as review_id,
      r.user_id,
      r.rating::numeric as overall_rating,
      r.category_ratings,
      r.notes as review_text,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      'personal_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        r.google_place_id = place_id_param 
        OR (
          restaurant_name_param IS NOT NULL AND r.google_place_id IS NULL AND (
            LOWER(TRIM(r.name)) = LOWER(TRIM(restaurant_name_param))
            OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'
            OR LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
          )
        )
      )
  )
  SELECT 
    cr.review_id,
    cr.user_id,
    COALESCE(p.username, 'Anonymous') as username,
    p.avatar_url,
    cr.overall_rating,
    cr.category_ratings,
    cr.review_text,
    cr.photos,
    cr.photo_captions,
    cr.photo_dish_names,
    cr.created_at,
    cr.source_type
  FROM combined_reviews cr
  JOIN expert_ids e ON e.user_id = cr.user_id
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY cr.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END; 
$$;
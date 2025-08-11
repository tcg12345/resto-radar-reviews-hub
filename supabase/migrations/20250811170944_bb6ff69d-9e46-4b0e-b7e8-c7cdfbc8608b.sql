-- Update or create friend reviews RPC to robustly fetch friends' reviews by place_id or name fallback
CREATE OR REPLACE FUNCTION public.get_friend_reviews_for_place(
  place_id_param text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  restaurant_name_param text DEFAULT NULL,
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
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
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE 
      WHEN f.user1_id = requesting_user_id THEN f.user2_id 
      ELSE f.user1_id 
    END AS user_id
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  combined_reviews AS (
    -- Explicit user reviews tied to a Google Place ID
    SELECT 
      ur.id::text as review_id,
      ur.user_id,
      COALESCE(ur.overall_rating, 0)::numeric as overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      'user_review'::text as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    -- Personal ratings from the restaurants table with flexible matching
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
      'personal_rating'::text as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Direct place_id match
        r.google_place_id = place_id_param
        OR 
        -- Fallback: r has no place_id but there exists a user_review with this place_id and a name match
        (
          r.google_place_id IS NULL AND place_id_param IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.user_reviews ur2 
            WHERE ur2.restaurant_place_id = place_id_param
              AND (
                LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
                OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
                OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
              )
          )
        )
        OR
        -- Additional fallback: name-based match from page param if provided
        (
          restaurant_name_param IS NOT NULL AND (
            LOWER(TRIM(r.name)) = LOWER(TRIM(restaurant_name_param))
            OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'
            OR LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
            OR similarity(LOWER(TRIM(r.name)), LOWER(TRIM(restaurant_name_param))) > 0.6
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
  JOIN friend_ids fi ON fi.user_id = cr.user_id
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY cr.created_at DESC
  LIMIT LEAST(page_limit, 100) OFFSET GREATEST(page_offset, 0);
END;
$function$;
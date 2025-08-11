-- Improve stats to work for all restaurants: fallback by name and dedupe per user
DROP FUNCTION IF EXISTS public.get_friend_rating_stats(text, uuid);
DROP FUNCTION IF EXISTS public.get_expert_rating_stats(text);

CREATE OR REPLACE FUNCTION public.get_friend_rating_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(avg_rating numeric, total_reviews bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS uid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  combined AS (
    -- Personal ratings from restaurants, with fallback name match when google_place_id is missing
    SELECT r.user_id AS uid, r.rating::numeric AS rating
    FROM public.restaurants r
    JOIN friend_ids fi ON fi.uid = r.user_id
    WHERE r.is_wishlist = false
      AND r.rating IS NOT NULL
      AND (
        r.google_place_id = place_id_param
        OR (
          r.google_place_id IS NULL
          AND EXISTS (
            SELECT 1 FROM public.user_reviews ur2
            WHERE ur2.restaurant_place_id = place_id_param
              AND (
                LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
                OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
                OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
              )
          )
        )
      )
    UNION ALL
    -- User reviews table
    SELECT ur.user_id AS uid, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    JOIN friend_ids fi ON fi.uid = ur.user_id
    WHERE ur.restaurant_place_id = place_id_param
  ),
  per_user AS (
    SELECT uid, AVG(rating)::numeric AS user_avg
    FROM combined
    GROUP BY uid
  )
  SELECT ROUND(AVG(user_avg), 2) AS avg_rating, COUNT(*)::bigint AS total_reviews
  FROM per_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expert_rating_stats(place_id_param text)
RETURNS TABLE(avg_rating numeric, total_reviews bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH expert_ids AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'expert'
  ),
  combined AS (
    -- Personal ratings from restaurants, with fallback name match when google_place_id is missing
    SELECT r.user_id AS uid, r.rating::numeric AS rating
    FROM public.restaurants r
    JOIN expert_ids e ON e.user_id = r.user_id
    WHERE r.is_wishlist = false
      AND r.rating IS NOT NULL
      AND (
        r.google_place_id = place_id_param
        OR (
          r.google_place_id IS NULL
          AND EXISTS (
            SELECT 1 FROM public.user_reviews ur2
            WHERE ur2.restaurant_place_id = place_id_param
              AND (
                LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
                OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
                OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
              )
          )
        )
      )
    UNION ALL
    -- User reviews table
    SELECT uv.user_id AS uid, uv.overall_rating::numeric AS rating
    FROM public.user_reviews uv
    JOIN expert_ids e ON e.user_id = uv.user_id
    WHERE uv.restaurant_place_id = place_id_param
  ),
  per_user AS (
    SELECT uid, AVG(rating)::numeric AS user_avg
    FROM combined
    GROUP BY uid
  )
  SELECT ROUND(AVG(user_avg), 2) AS avg_rating, COUNT(*)::bigint AS total_reviews
  FROM per_user;
END;
$$;
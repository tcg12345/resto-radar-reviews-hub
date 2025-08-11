-- Improve friend and expert rating stats to include name-based fallback and avoid double-counting when both review types exist

-- Update get_friend_rating_stats
CREATE OR REPLACE FUNCTION public.get_friend_rating_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(avg_rating numeric, total_reviews integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS fid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  user_review_ratings AS (
    SELECT DISTINCT ON (ur.user_id)
      ur.user_id,
      ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    ORDER BY ur.user_id, ur.created_at DESC
  ),
  personal_ratings AS (
    SELECT DISTINCT ON (r.user_id)
      r.user_id,
      r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL
      AND r.is_wishlist = false
      AND (
        r.google_place_id = place_id_param
        OR (
          r.google_place_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.user_reviews ur2
            WHERE ur2.restaurant_place_id = place_id_param
              AND (
                LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
                OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
                OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
              )
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_reviews ur3
        WHERE ur3.restaurant_place_id = place_id_param
          AND ur3.user_id = r.user_id
      )
    ORDER BY r.user_id, COALESCE(r.date_visited, r.created_at) DESC
  ),
  combined AS (
    SELECT * FROM user_review_ratings
    UNION ALL
    SELECT * FROM personal_ratings
  )
  SELECT ROUND(AVG(c.rating)::numeric, 2) AS avg_rating, COUNT(*) AS total_reviews
  FROM combined c
  JOIN friend_ids f ON f.fid = c.user_id;
END; $function$;

-- Update get_expert_rating_stats
CREATE OR REPLACE FUNCTION public.get_expert_rating_stats(place_id_param text)
 RETURNS TABLE(avg_rating numeric, total_reviews integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH expert_ids AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'expert'
  ),
  user_review_ratings AS (
    SELECT DISTINCT ON (ur.user_id)
      ur.user_id,
      ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    ORDER BY ur.user_id, ur.created_at DESC
  ),
  personal_ratings AS (
    SELECT DISTINCT ON (r.user_id)
      r.user_id,
      r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL
      AND r.is_wishlist = false
      AND (
        r.google_place_id = place_id_param
        OR (
          r.google_place_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.user_reviews ur2
            WHERE ur2.restaurant_place_id = place_id_param
              AND (
                LOWER(TRIM(ur2.restaurant_name)) = LOWER(TRIM(r.name))
                OR LOWER(TRIM(ur2.restaurant_name)) LIKE '%' || LOWER(TRIM(r.name)) || '%'
                OR LOWER(TRIM(r.name)) LIKE '%' || LOWER(TRIM(ur2.restaurant_name)) || '%'
              )
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_reviews ur3
        WHERE ur3.restaurant_place_id = place_id_param
          AND ur3.user_id = r.user_id
      )
    ORDER BY r.user_id, COALESCE(r.date_visited, r.created_at) DESC
  ),
  combined AS (
    SELECT * FROM user_review_ratings
    UNION ALL
    SELECT * FROM personal_ratings
  )
  SELECT ROUND(AVG(c.rating)::numeric, 2) AS avg_rating, COUNT(*) AS total_reviews
  FROM combined c
  JOIN expert_ids e ON e.user_id = c.user_id;
END; $function$;
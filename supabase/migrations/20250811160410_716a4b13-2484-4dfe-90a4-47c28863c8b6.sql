-- Include place_ratings in friend/expert stats and add helpful indexes

-- Indexes for place_ratings
CREATE INDEX IF NOT EXISTS idx_place_ratings_place ON public.place_ratings (place_id);
CREATE INDEX IF NOT EXISTS idx_place_ratings_user ON public.place_ratings (user_id);

-- Replace friend stats function to also consider place_ratings
CREATE OR REPLACE FUNCTION public.get_friend_rating_stats(
  place_id_param text,
  restaurant_name_param text DEFAULT NULL,
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(avg_rating numeric, total_reviews integer)
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
  name_candidates AS (
    SELECT COALESCE(restaurant_name_param, (
      SELECT ur.restaurant_name FROM public.user_reviews ur 
      WHERE ur.restaurant_place_id = place_id_param 
      ORDER BY ur.created_at DESC LIMIT 1
    )) AS name_val
  ),
  combined AS (
    -- User reviews tied to exact place_id
    SELECT ur.user_id, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    -- Personal ratings with exact place_id
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param

    UNION ALL

    -- Trip place_ratings with exact place_id
    SELECT pr.user_id, pr.overall_rating::numeric AS rating
    FROM public.place_ratings pr
    WHERE pr.place_id = place_id_param AND pr.overall_rating IS NOT NULL

    UNION ALL

    -- Fallback: personal ratings without place_id but name matches
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r, name_candidates nc
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id IS NULL
      AND nc.name_val IS NOT NULL
      AND (
        public.normalize_text(r.name) = public.normalize_text(nc.name_val)
        OR (
          LENGTH(nc.name_val) > 5 AND (
            public.normalize_text(r.name) LIKE '%' || public.normalize_text(nc.name_val) || '%'
            OR public.normalize_text(nc.name_val) LIKE '%' || public.normalize_text(r.name) || '%'
          )
        )
      )

    UNION ALL

    -- Fallback: trip place_ratings without place_id but name matches
    SELECT pr.user_id, pr.overall_rating::numeric AS rating
    FROM public.place_ratings pr, name_candidates nc
    WHERE pr.overall_rating IS NOT NULL AND pr.place_id IS NULL
      AND nc.name_val IS NOT NULL
      AND (
        public.normalize_text(pr.place_name) = public.normalize_text(nc.name_val)
        OR (
          LENGTH(nc.name_val) > 5 AND (
            public.normalize_text(pr.place_name) LIKE '%' || public.normalize_text(nc.name_val) || '%'
            OR public.normalize_text(nc.name_val) LIKE '%' || public.normalize_text(pr.place_name) || '%'
          )
        )
      )
  ),
  friend_reviews AS (
    SELECT c.user_id, AVG(c.rating) AS user_avg
    FROM combined c
    JOIN friend_ids f ON f.fid = c.user_id
    GROUP BY c.user_id
  )
  SELECT 
    COALESCE(AVG(fr.user_avg), 0)::numeric AS avg_rating,
    COALESCE(COUNT(*), 0)::integer AS total_reviews
  FROM friend_reviews fr;
END;
$$;

-- Replace expert stats function likewise
CREATE OR REPLACE FUNCTION public.get_expert_rating_stats(
  place_id_param text,
  restaurant_name_param text DEFAULT NULL
)
RETURNS TABLE(avg_rating numeric, total_reviews integer)
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
  name_candidates AS (
    SELECT COALESCE(restaurant_name_param, (
      SELECT ur.restaurant_name FROM public.user_reviews ur 
      WHERE ur.restaurant_place_id = place_id_param 
      ORDER BY ur.created_at DESC LIMIT 1
    )) AS name_val
  ),
  combined AS (
    -- User reviews tied to exact place_id
    SELECT ur.user_id, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    -- Personal ratings with exact place_id
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param

    UNION ALL

    -- Trip place_ratings with exact place_id
    SELECT pr.user_id, pr.overall_rating::numeric AS rating
    FROM public.place_ratings pr
    WHERE pr.place_id = place_id_param AND pr.overall_rating IS NOT NULL

    UNION ALL

    -- Fallback: personal ratings without place_id but name matches
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r, name_candidates nc
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id IS NULL
      AND nc.name_val IS NOT NULL
      AND (
        public.normalize_text(r.name) = public.normalize_text(nc.name_val)
        OR (
          LENGTH(nc.name_val) > 5 AND (
            public.normalize_text(r.name) LIKE '%' || public.normalize_text(nc.name_val) || '%'
            OR public.normalize_text(nc.name_val) LIKE '%' || public.normalize_text(r.name) || '%'
          )
        )
      )

    UNION ALL

    -- Fallback: trip place_ratings without place_id but name matches
    SELECT pr.user_id, pr.overall_rating::numeric AS rating
    FROM public.place_ratings pr, name_candidates nc
    WHERE pr.overall_rating IS NOT NULL AND pr.place_id IS NULL
      AND nc.name_val IS NOT NULL
      AND (
        public.normalize_text(pr.place_name) = public.normalize_text(nc.name_val)
        OR (
          LENGTH(nc.name_val) > 5 AND (
            public.normalize_text(pr.place_name) LIKE '%' || public.normalize_text(nc.name_val) || '%'
            OR public.normalize_text(nc.name_val) LIKE '%' || public.normalize_text(pr.place_name) || '%'
          )
        )
      )
  ),
  expert_reviews AS (
    SELECT c.user_id, AVG(c.rating) AS user_avg
    FROM combined c
    JOIN expert_ids e ON e.user_id = c.user_id
    GROUP BY c.user_id
  )
  SELECT 
    COALESCE(AVG(er.user_avg), 0)::numeric AS avg_rating,
    COALESCE(COUNT(*), 0)::integer AS total_reviews
  FROM expert_reviews er;
END;
$$;
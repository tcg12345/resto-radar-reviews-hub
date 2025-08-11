-- Optimized friend/expert rating stats with name fallback and indexes

-- Indexes to speed up queries
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON public.restaurants (google_place_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_user_rating ON public.restaurants (user_id) WHERE rating IS NOT NULL AND is_wishlist = false;
CREATE INDEX IF NOT EXISTS idx_user_reviews_place ON public.user_reviews (restaurant_place_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_user ON public.user_reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_user ON public.user_roles (role, user_id);

-- Helper function: normalize text for simple matching
CREATE OR REPLACE FUNCTION public.normalize_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(TRIM(regexp_replace($1, '\\s+', ' ', 'g')));
$$;

-- Friend rating stats
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
    -- Prefer provided name; fallback to any name from user_reviews for this place
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
  ),
  friend_reviews AS (
    -- Keep one rating per friend (latest preference using max by created_at is complex; use avg per user)
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

-- Expert rating stats
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
    SELECT ur.user_id, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param

    UNION ALL

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
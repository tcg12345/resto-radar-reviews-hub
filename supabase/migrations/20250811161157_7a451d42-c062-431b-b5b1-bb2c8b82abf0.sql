-- Add debugging to the friend rating stats function
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
  -- Debug logging
  RAISE LOG 'DEBUG: place_id_param = %, restaurant_name_param = %, requesting_user_id = %', 
    place_id_param, restaurant_name_param, requesting_user_id;

  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS fid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  debug_friends AS (
    SELECT COUNT(*) as friend_count FROM friend_ids
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
    SELECT ur.user_id, ur.overall_rating::numeric AS rating, 'user_reviews_exact' as source
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    -- Personal ratings with exact place_id
    SELECT r.user_id, r.rating::numeric AS rating, 'restaurants_exact' as source
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param

    UNION ALL

    -- Trip place_ratings with exact place_id
    SELECT pr.user_id, pr.overall_rating::numeric AS rating, 'place_ratings_exact' as source
    FROM public.place_ratings pr
    WHERE pr.place_id = place_id_param AND pr.overall_rating IS NOT NULL

    UNION ALL

    -- Fallback: personal ratings without place_id but name matches
    SELECT r.user_id, r.rating::numeric AS rating, 'restaurants_name' as source
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
    SELECT pr.user_id, pr.overall_rating::numeric AS rating, 'place_ratings_name' as source
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
  all_ratings AS (
    SELECT COUNT(*) as total_ratings_found FROM combined
  ),
  friend_reviews AS (
    SELECT c.user_id, AVG(c.rating) AS user_avg, c.source
    FROM combined c
    JOIN friend_ids f ON f.fid = c.user_id
    GROUP BY c.user_id, c.source
  ),
  final_stats AS (
    SELECT 
      COALESCE(AVG(fr.user_avg), 0)::numeric AS avg_rating,
      COALESCE(COUNT(*), 0)::integer AS total_reviews
    FROM friend_reviews fr
  )
  SELECT fs.avg_rating, fs.total_reviews
  FROM final_stats fs
  CROSS JOIN debug_friends df
  CROSS JOIN all_ratings ar
  WHERE (
    RAISE LOG 'DEBUG RESULTS: friends_count=%, all_ratings_found=%, final_avg=%, final_count=%', 
    df.friend_count, ar.total_ratings_found, fs.avg_rating, fs.total_reviews
  ) OR true;
END;
$$;
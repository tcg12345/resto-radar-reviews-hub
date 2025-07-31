-- Fix community stats function to better match restaurants with null google_place_id
DROP FUNCTION IF EXISTS get_restaurant_community_stats(text, uuid);

CREATE OR REPLACE FUNCTION public.get_restaurant_community_stats(
  place_id_param text, 
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  average_rating numeric, 
  total_reviews bigint, 
  rating_distribution jsonb, 
  recent_photos jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  restaurant_name_from_place text;
  restaurant_address_from_place text;
BEGIN
  -- First try to get restaurant name and address from existing user_reviews for this place_id
  SELECT ur.restaurant_name, ur.restaurant_address 
  INTO restaurant_name_from_place, restaurant_address_from_place
  FROM public.user_reviews ur 
  WHERE ur.restaurant_place_id = place_id_param 
  LIMIT 1;

  RETURN QUERY
  WITH combined_reviews AS (
    -- User reviews from user_reviews table (for ratings) - these take priority
    SELECT 
      ur.overall_rating as rating,
      ur.user_id,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      ur.helpful_count,
      ur.id as review_id,
      'user_review' as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    
    UNION ALL
    
    -- Personal restaurant ratings from restaurants table (for ratings)
    -- Include if: 1) exact google_place_id match, OR 2) name/location match when google_place_id is null
    SELECT 
      r.rating::double precision as rating,
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id,
      'restaurant_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND (
        -- Direct google_place_id match
        r.google_place_id = place_id_param 
        OR 
        -- If google_place_id is null, try to match by name and address similarity
        (r.google_place_id IS NULL AND (
          -- If we have existing user_reviews for this place, match by name/address
          (restaurant_name_from_place IS NOT NULL AND 
           r.name ILIKE '%' || restaurant_name_from_place || '%' AND
           r.address ILIKE '%' || SPLIT_PART(restaurant_address_from_place, ',', 1) || '%')
          OR
          -- Otherwise try reverse lookup from user_reviews
          place_id_param IN (
            SELECT ur2.restaurant_place_id 
            FROM public.user_reviews ur2 
            WHERE ur2.restaurant_name ILIKE '%' || r.name || '%'
            AND ur2.restaurant_address ILIKE '%' || r.city || '%'
            LIMIT 1
          )
        ))
      )
      -- Exclude if this user already has a user_review for this place
      AND NOT EXISTS (
        SELECT 1 FROM public.user_reviews ur3
        WHERE ur3.restaurant_place_id = place_id_param 
        AND ur3.user_id = r.user_id
      )
  ),
  review_stats AS (
    SELECT 
      AVG(rating)::numeric as avg_rating,
      COUNT(*)::bigint as total_count,
      jsonb_build_object(
        '9-10', COUNT(*) FILTER (WHERE rating >= 9),
        '7-8', COUNT(*) FILTER (WHERE rating >= 7 AND rating < 9),
        '5-6', COUNT(*) FILTER (WHERE rating >= 5 AND rating < 7),
        '3-4', COUNT(*) FILTER (WHERE rating >= 3 AND rating < 5),
        '1-2', COUNT(*) FILTER (WHERE rating >= 1 AND rating < 3)
      ) as distribution
    FROM combined_reviews
  ),
  visible_photos AS (
    -- User reviews photos (always visible)
    SELECT 
      ur.user_id,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      ur.helpful_count,
      ur.id as review_id
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
      AND array_length(ur.photos, 1) > 0
    
    UNION ALL
    
    -- Personal restaurant photos (only if user is public or friend)
    SELECT 
      r.user_id,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      0 as helpful_count,
      r.id as review_id
    FROM public.restaurants r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.rating IS NOT NULL 
      AND r.is_wishlist = false
      AND array_length(r.photos, 1) > 0
      AND (
        -- Same matching logic as above
        r.google_place_id = place_id_param 
        OR 
        (r.google_place_id IS NULL AND (
          (restaurant_name_from_place IS NOT NULL AND 
           r.name ILIKE '%' || restaurant_name_from_place || '%' AND
           r.address ILIKE '%' || SPLIT_PART(restaurant_address_from_place, ',', 1) || '%')
          OR
          place_id_param IN (
            SELECT ur2.restaurant_place_id 
            FROM public.user_reviews ur2 
            WHERE ur2.restaurant_name ILIKE '%' || r.name || '%'
            AND ur2.restaurant_address ILIKE '%' || r.city || '%'
            LIMIT 1
          )
        ))
      )
      AND (
        p.is_public = true 
        OR r.user_id = requesting_user_id
        OR (requesting_user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.friends f
          WHERE (f.user1_id = requesting_user_id AND f.user2_id = r.user_id)
             OR (f.user2_id = requesting_user_id AND f.user1_id = r.user_id)
        ))
      )
      -- Exclude if this user already has a user_review for this place
      AND NOT EXISTS (
        SELECT 1 FROM public.user_reviews ur3
        WHERE ur3.restaurant_place_id = place_id_param 
        AND ur3.user_id = r.user_id
      )
  ),
  photo_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'review_id', vp.review_id,
        'user_id', vp.user_id,
        'username', p.username,
        'photos', vp.photos,
        'captions', vp.photo_captions,
        'dish_names', vp.photo_dish_names,
        'created_at', vp.created_at,
        'helpful_count', vp.helpful_count
      ) ORDER BY vp.created_at DESC
    ) as photos
    FROM visible_photos vp
    LEFT JOIN public.profiles p ON p.id = vp.user_id
    LIMIT 20
  )
  SELECT 
    COALESCE(rs.avg_rating, 0),
    COALESCE(rs.total_count, 0),
    COALESCE(rs.distribution, '{}'::jsonb),
    COALESCE(pd.photos, '[]'::jsonb)
  FROM review_stats rs
  CROSS JOIN photo_data pd;
END;
$$;
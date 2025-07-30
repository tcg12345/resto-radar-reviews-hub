-- Fix function search path security warnings
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_reviews 
  SET helpful_count = (
    SELECT COUNT(*) 
    FROM public.review_helpfulness 
    WHERE review_id = COALESCE(NEW.review_id, OLD.review_id) 
    AND is_helpful = true
  )
  WHERE id = COALESCE(NEW.review_id, OLD.review_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION get_restaurant_community_stats(place_id_param text)
RETURNS TABLE(
  average_rating numeric,
  total_reviews bigint,
  rating_distribution jsonb,
  recent_photos jsonb
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH review_stats AS (
    SELECT 
      AVG(overall_rating)::numeric(3,2) as avg_rating,
      COUNT(*)::bigint as total_count,
      jsonb_build_object(
        '9-10', COUNT(*) FILTER (WHERE overall_rating >= 9),
        '7-8', COUNT(*) FILTER (WHERE overall_rating >= 7 AND overall_rating < 9),
        '5-6', COUNT(*) FILTER (WHERE overall_rating >= 5 AND overall_rating < 7),
        '3-4', COUNT(*) FILTER (WHERE overall_rating >= 3 AND overall_rating < 5),
        '1-2', COUNT(*) FILTER (WHERE overall_rating >= 1 AND overall_rating < 3)
      ) as distribution
    FROM public.user_reviews
    WHERE restaurant_place_id = place_id_param
  ),
  photo_data AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'review_id', ur.id,
        'user_id', ur.user_id,
        'username', p.username,
        'photos', ur.photos,
        'captions', ur.photo_captions,
        'dish_names', ur.photo_dish_names,
        'created_at', ur.created_at,
        'helpful_count', ur.helpful_count
      ) ORDER BY ur.created_at DESC
    ) as photos
    FROM public.user_reviews ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.restaurant_place_id = place_id_param 
    AND array_length(ur.photos, 1) > 0
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

CREATE OR REPLACE FUNCTION get_restaurant_reviews(
  place_id_param text,
  page_limit integer DEFAULT 10,
  page_offset integer DEFAULT 0,
  sort_by text DEFAULT 'recent'
)
RETURNS TABLE(
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_clause text;
BEGIN
  -- Determine order clause based on sort_by parameter
  order_clause := CASE sort_by
    WHEN 'helpful' THEN 'ur.helpful_count DESC, ur.created_at DESC'
    WHEN 'rating_high' THEN 'ur.overall_rating DESC, ur.created_at DESC'
    WHEN 'rating_low' THEN 'ur.overall_rating ASC, ur.created_at DESC'
    ELSE 'ur.created_at DESC'
  END;

  RETURN QUERY EXECUTE format('
    SELECT 
      ur.id,
      ur.user_id,
      COALESCE(p.username, ''Anonymous'') as username,
      ur.overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.helpful_count,
      ur.created_at,
      COALESCE(rh.is_helpful, false) as user_found_helpful
    FROM public.user_reviews ur
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    LEFT JOIN public.review_helpfulness rh ON rh.review_id = ur.id AND rh.user_id = auth.uid()
    WHERE ur.restaurant_place_id = $1
    ORDER BY %s
    LIMIT $2 OFFSET $3
  ', order_clause)
  USING place_id_param, page_limit, page_offset;
END;
$$;
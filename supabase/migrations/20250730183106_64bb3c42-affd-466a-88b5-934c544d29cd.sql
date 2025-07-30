-- Create user reviews table for community ratings and photos
CREATE TABLE public.user_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  restaurant_place_id text, -- Google Place ID for linking to restaurants
  restaurant_name text NOT NULL,
  restaurant_address text NOT NULL,
  overall_rating double precision CHECK (overall_rating >= 0 AND overall_rating <= 10),
  category_ratings jsonb, -- {food: 8.5, service: 7.0, atmosphere: 9.0}
  review_text text,
  photos text[] DEFAULT '{}',
  photo_captions text[] DEFAULT '{}',
  photo_dish_names text[] DEFAULT '{}',
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_user_reviews_restaurant_place_id ON public.user_reviews(restaurant_place_id);
CREATE INDEX idx_user_reviews_user_id ON public.user_reviews(user_id);
CREATE INDEX idx_user_reviews_created_at ON public.user_reviews(created_at DESC);
CREATE INDEX idx_user_reviews_rating ON public.user_reviews(overall_rating DESC);

-- Create review helpfulness table
CREATE TABLE public.review_helpfulness (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.user_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  is_helpful boolean NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpfulness ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_reviews
CREATE POLICY "Anyone can view published reviews" ON public.user_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON public.user_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.user_reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.user_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for review_helpfulness
CREATE POLICY "Anyone can view helpfulness" ON public.review_helpfulness
  FOR SELECT USING (true);

CREATE POLICY "Users can mark reviews as helpful" ON public.review_helpfulness
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their helpfulness votes" ON public.review_helpfulness
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their helpfulness votes" ON public.review_helpfulness
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update helpful_count
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_helpful_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.review_helpfulness
  FOR EACH ROW EXECUTE FUNCTION update_review_helpful_count();

-- Function to get restaurant community stats
CREATE OR REPLACE FUNCTION get_restaurant_community_stats(place_id_param text)
RETURNS TABLE(
  average_rating numeric,
  total_reviews bigint,
  rating_distribution jsonb,
  recent_photos jsonb
) 
LANGUAGE plpgsql
STABLE
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

-- Function to get paginated reviews for a restaurant
CREATE OR REPLACE FUNCTION get_restaurant_reviews(
  place_id_param text,
  page_limit integer DEFAULT 10,
  page_offset integer DEFAULT 0,
  sort_by text DEFAULT 'recent' -- 'recent', 'helpful', 'rating_high', 'rating_low'
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

-- Add updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_reviews
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();
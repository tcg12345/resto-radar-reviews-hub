-- Create optimized function for user stats aggregation
CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id UUID)
RETURNS TABLE (
  rated_count INTEGER,
  wishlist_count INTEGER,
  avg_rating NUMERIC,
  top_cuisine TEXT
) 
LANGUAGE SQL
STABLE
AS $$
  WITH rated_stats AS (
    SELECT 
      COUNT(*)::INTEGER as rated_count,
      AVG(rating)::NUMERIC as avg_rating,
      MODE() WITHIN GROUP (ORDER BY cuisine) as top_cuisine
    FROM public.restaurants 
    WHERE user_id = target_user_id 
      AND is_wishlist = false 
      AND rating IS NOT NULL
  ),
  wishlist_stats AS (
    SELECT COUNT(*)::INTEGER as wishlist_count
    FROM public.restaurants 
    WHERE user_id = target_user_id 
      AND is_wishlist = true
  )
  SELECT 
    COALESCE(r.rated_count, 0) as rated_count,
    COALESCE(w.wishlist_count, 0) as wishlist_count,
    COALESCE(r.avg_rating, 0) as avg_rating,
    COALESCE(r.top_cuisine, '') as top_cuisine
  FROM rated_stats r
  CROSS JOIN wishlist_stats w;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_user_wishlist_rating 
ON public.restaurants (user_id, is_wishlist, rating) 
WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_user_created_at 
ON public.restaurants (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine 
ON public.restaurants (cuisine) 
WHERE cuisine IS NOT NULL;
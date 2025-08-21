-- Fix security issues from the linter

-- Fix Function Search Path Mutable warnings by setting search_path for existing functions
CREATE OR REPLACE FUNCTION public.search_profiles_safely(search_query text, limit_count integer DEFAULT 20)
RETURNS TABLE(id uuid, username text, name text, avatar_url text, home_city text, bio text, is_public boolean, allow_friend_requests boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.name,
    p.avatar_url,
    p.home_city,
    p.bio,
    p.is_public,
    p.allow_friend_requests
  FROM public.profiles p
  WHERE 
    auth.uid() IS NOT NULL AND
    auth.uid() != p.id AND
    (p.is_public = true OR p.allow_friend_requests = true) AND
    (
      p.username ILIKE '%' || search_query || '%' OR
      p.name ILIKE '%' || search_query || '%' OR
      p.home_city ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    CASE 
      WHEN p.username ILIKE search_query THEN 1
      WHEN p.username ILIKE search_query || '%' THEN 2
      WHEN p.name ILIKE search_query || '%' THEN 3
      ELSE 4
    END
  LIMIT LEAST(limit_count, 50);
$$;

-- Update other security definer functions to have proper search_path
CREATE OR REPLACE FUNCTION public.get_user_score(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.restaurants 
  WHERE user_id = $1 AND rating IS NOT NULL AND is_wishlist = false;
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id uuid)
RETURNS TABLE(rated_count integer, wishlist_count integer, avg_rating numeric, top_cuisine text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
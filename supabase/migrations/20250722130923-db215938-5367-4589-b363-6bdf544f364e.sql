-- CRITICAL SECURITY FIX: Update all database functions to include proper search_path
-- This prevents function hijacking attacks by ensuring functions only access public schema

-- Fix get_friends_with_scores function
CREATE OR REPLACE FUNCTION public.get_friends_with_scores(requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(friend_id uuid, username text, name text, avatar_url text, is_public boolean, score integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id as friend_id,
    p.username,
    p.name,
    p.avatar_url,
    p.is_public,
    COALESCE(
      (SELECT COUNT(*)::INTEGER 
       FROM public.restaurants r 
       WHERE r.user_id = p.id AND r.rating IS NOT NULL AND r.is_wishlist = false), 
      0
    ) as score
  FROM public.profiles p
  JOIN public.friends f ON (
    (f.user1_id = requesting_user_id AND f.user2_id = p.id) OR
    (f.user2_id = requesting_user_id AND f.user1_id = p.id)
  )
  WHERE p.id != requesting_user_id
  ORDER BY score DESC, p.username ASC;
$function$;

-- Fix get_user_stats function
CREATE OR REPLACE FUNCTION public.get_user_stats(target_user_id uuid)
 RETURNS TABLE(rated_count integer, wishlist_count integer, avg_rating numeric, top_cuisine text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix get_friends_recent_activity function
CREATE OR REPLACE FUNCTION public.get_friends_recent_activity(requesting_user_id uuid DEFAULT auth.uid(), activity_limit integer DEFAULT 10)
 RETURNS TABLE(restaurant_id uuid, restaurant_name text, cuisine text, rating numeric, date_visited timestamp with time zone, created_at timestamp with time zone, friend_id uuid, friend_username text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    r.id as restaurant_id,
    r.name as restaurant_name,
    r.cuisine,
    r.rating,
    r.date_visited,
    r.created_at,
    r.user_id as friend_id,
    p.username as friend_username
  FROM public.restaurants r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN public.friends f ON (
    (f.user1_id = requesting_user_id AND f.user2_id = r.user_id) OR
    (f.user2_id = requesting_user_id AND f.user1_id = r.user_id)
  )
  WHERE r.is_wishlist = false 
    AND r.rating IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  LIMIT LEAST(activity_limit, 50);
$function$;

-- Fix get_user_score function
CREATE OR REPLACE FUNCTION public.get_user_score(user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.restaurants 
  WHERE user_id = $1 AND rating IS NOT NULL AND is_wishlist = false;
$function$;

-- Fix get_cached_friend_activity function
CREATE OR REPLACE FUNCTION public.get_cached_friend_activity(requesting_user_id uuid DEFAULT auth.uid(), page_size integer DEFAULT 10, page_offset integer DEFAULT 0)
 RETURNS TABLE(activity_data jsonb, activity_date timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    fac.activity_data,
    fac.activity_date
  FROM public.friend_activity_cache fac
  WHERE fac.user_id = requesting_user_id
  ORDER BY fac.activity_date DESC
  LIMIT LEAST(page_size, 10)
  OFFSET page_offset;
$function$;

-- PRIVACY SECURITY FIX: Replace overly permissive profile visibility policy
-- Drop the dangerous "view all profiles" policy
DROP POLICY IF EXISTS "Users can view all profiles for search" ON public.profiles;

-- Create more secure policies for profile visibility
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles" 
ON public.profiles 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can view friends' profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.friends 
    WHERE (user1_id = auth.uid() AND user2_id = id) 
    OR (user2_id = auth.uid() AND user1_id = id)
  )
);

-- Add rate limiting table for edge function security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits table
CREATE POLICY "Users can view their own rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  target_user_id uuid,
  endpoint_name text,
  max_requests integer DEFAULT 10,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start timestamp with time zone;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::interval;
  
  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM public.rate_limits
  WHERE user_id = target_user_id
    AND endpoint = endpoint_name
    AND window_start > window_start;
  
  -- Clean old entries
  DELETE FROM public.rate_limits
  WHERE window_start < window_start;
  
  -- Check if under limit
  IF current_count >= max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (target_user_id, endpoint_name, 1, now())
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;
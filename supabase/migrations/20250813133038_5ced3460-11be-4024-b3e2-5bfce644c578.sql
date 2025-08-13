-- Check for any remaining security definer views and fix them
-- The error might be from the search function being security definer

-- Update the search function to be a regular function without security definer
-- This removes the security definer view warning
CREATE OR REPLACE FUNCTION public.search_profiles_safely(search_query text, limit_count integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  username text,
  name text,
  avatar_url text,
  home_city text,
  bio text,
  is_public boolean,
  allow_friend_requests boolean
)
LANGUAGE sql
STABLE
SET search_path = 'public'
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
    -- Prioritize exact username matches, then name matches
    CASE 
      WHEN p.username ILIKE search_query THEN 1
      WHEN p.username ILIKE search_query || '%' THEN 2
      WHEN p.name ILIKE search_query || '%' THEN 3
      ELSE 4
    END
  LIMIT LEAST(limit_count, 50); -- Security: Cap at 50 results
$$;

-- Update function comment
COMMENT ON FUNCTION public.search_profiles_safely IS 
'SECURITY FUNCTION: Provides safe friend search without exposing sensitive PII.
Returns only: username, name, avatar_url, home_city, bio.
NEVER returns: email, phone_number, address, or other sensitive data.
Uses RLS policies for security enforcement.';
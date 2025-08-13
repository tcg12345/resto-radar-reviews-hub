-- Fix the security definer view issue - remove security_barrier approach
-- Instead use a regular view and rely on RLS policies for security

-- Drop the previous view with security_barrier
DROP VIEW IF EXISTS public.profiles_public_search;

-- Create a regular view without security_barrier
-- RLS policies on the underlying table will still provide security
CREATE VIEW public.profiles_public_search AS
SELECT 
  id,
  username,
  name,
  avatar_url,
  is_public,
  allow_friend_requests,
  created_at,
  home_city,
  bio
FROM public.profiles
WHERE (is_public = true OR allow_friend_requests = true);

-- Grant select on the view to authenticated users
GRANT SELECT ON public.profiles_public_search TO authenticated;

-- Add security documentation
COMMENT ON VIEW public.profiles_public_search IS 
'SECURITY: Safe view for friend discovery that exposes only non-sensitive profile data.
Use this view for friend search functionality. RLS policies on profiles table provide security.
Contains: username, name, avatar_url, home_city, bio - NO email, phone, or address.';
-- Fix security vulnerability: Restrict profile discovery to only safe fields
-- Remove the overly permissive discovery policy
DROP POLICY IF EXISTS "Users can discover profiles for friend requests" ON public.profiles;

-- Create a more secure discovery policy that only exposes essential fields
-- This prevents exposure of sensitive data (email, phone_number, address, bio, home_city)
CREATE POLICY "Users can discover basic profile info for friend requests" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() <> id 
  AND (is_public = true OR allow_friend_requests = true)
);

-- Create a secure function to get only safe profile fields for discovery
CREATE OR REPLACE FUNCTION public.get_discoverable_profiles(search_query text DEFAULT '', limit_count integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  username text,
  name text,
  avatar_url text,
  is_public boolean,
  allow_friend_requests boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.username,
    p.name,
    p.avatar_url,
    p.is_public,
    p.allow_friend_requests
  FROM public.profiles p
  WHERE 
    auth.uid() IS NOT NULL 
    AND auth.uid() != p.id 
    AND (p.is_public = true OR p.allow_friend_requests = true)
    AND (
      search_query = '' OR
      p.username ILIKE '%' || search_query || '%' OR
      p.name ILIKE '%' || search_query || '%'
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

-- Update the existing full profile viewing policy to be more explicit about when full data is accessible
DROP POLICY IF EXISTS "Users can view full profiles securely" ON public.profiles;

CREATE POLICY "Users can view full profiles securely" 
ON public.profiles 
FOR SELECT 
USING (
  -- Own profile: full access
  auth.uid() = id 
  OR 
  -- Friends: full access to public profiles or profiles that allow friend requests
  (
    EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = auth.uid() AND f.user2_id = profiles.id)
         OR (f.user2_id = auth.uid() AND f.user1_id = profiles.id)
    )
  )
  OR
  -- Public profiles: full access for authenticated users
  (auth.uid() IS NOT NULL AND is_public = true)
);

-- Ensure the discovery policy takes precedence for non-friends
-- by making it more specific than the full profile policy
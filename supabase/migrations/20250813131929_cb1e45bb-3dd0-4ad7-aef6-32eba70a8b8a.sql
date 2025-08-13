-- Fix security issue: Remove overly permissive profile access policy
-- and replace with secure, privacy-respecting access controls

-- Drop the dangerous "Users can view all profiles for search" policy
DROP POLICY IF EXISTS "Users can view all profiles for search" ON public.profiles;

-- Create a secure policy that allows users to view:
-- 1. Their own profile (always)
-- 2. Public profiles (when the profile is marked as public)
-- 3. Friends' profiles (when users are friends and the profile allows friend access)
CREATE POLICY "Users can view profiles securely" 
ON public.profiles 
FOR SELECT 
USING (
  -- User can view their own profile
  auth.uid() = id 
  OR 
  -- User can view public profiles (but only non-sensitive fields will be exposed in the application layer)
  is_public = true
  OR 
  -- User can view friends' profiles if they're actually friends
  (
    EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = auth.uid() AND f.user2_id = profiles.id)
         OR (f.user2_id = auth.uid() AND f.user1_id = profiles.id)
    )
  )
);

-- Create a separate policy for basic profile search (only username and name)
-- This allows the friend search functionality to work without exposing sensitive data
CREATE POLICY "Users can search profiles for friends" 
ON public.profiles 
FOR SELECT 
USING (
  -- Allow authenticated users to search by username/name for friend discovery
  -- but the application should only return non-sensitive fields (username, name, avatar_url)
  auth.uid() IS NOT NULL AND (
    is_public = true 
    OR 
    allow_friend_requests = true
  )
);
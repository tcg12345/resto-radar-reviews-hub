-- Update RLS policies to allow viewing all profiles for search functionality
-- Users should be able to search for anyone, but privacy settings affect what data they can see

-- Drop existing policies
DROP POLICY "Users can view public profiles" ON public.profiles;
DROP POLICY "Users can view friends' profiles" ON public.profiles;

-- Create new policy that allows viewing all profiles for search
CREATE POLICY "Users can view all profiles for search" 
ON public.profiles 
FOR SELECT 
USING (true);
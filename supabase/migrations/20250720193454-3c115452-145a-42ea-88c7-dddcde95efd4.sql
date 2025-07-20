-- Update RLS policies for profiles table to allow viewing public profiles and friend profiles

-- Drop existing view policy
DROP POLICY "Users can view their own profile" ON public.profiles;

-- Create new policies for profile visibility
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
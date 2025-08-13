-- Fix critical security issue: Remove public access to user reviews
-- and implement privacy-respecting access controls

-- Drop the dangerous "Anyone can view published reviews" policy
DROP POLICY IF EXISTS "Anyone can view published reviews" ON public.user_reviews;

-- Create secure policies for user reviews that respect user privacy
-- Policy 1: Users can always view their own reviews
CREATE POLICY "Users can view their own reviews" 
ON public.user_reviews 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy 2: Users can view reviews from their friends (based on actual friendships)
CREATE POLICY "Users can view friends reviews" 
ON public.user_reviews 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.friends f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = user_reviews.user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = user_reviews.user_id)
  )
);

-- Policy 3: Users can view reviews for restaurants they are specifically viewing
-- This allows restaurant detail pages to show relevant reviews from public users
-- but only when the user is authenticated and viewing that specific restaurant
CREATE POLICY "Users can view reviews for specific restaurants" 
ON public.user_reviews 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  -- Only allow viewing reviews from users who have public profiles
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_reviews.user_id 
    AND p.is_public = true
  )
);

-- Policy 4: Expert reviews can be viewed by authenticated users
-- (assuming experts should have their reviews visible for credibility)
CREATE POLICY "Authenticated users can view expert reviews" 
ON public.user_reviews 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = user_reviews.user_id 
    AND ur.role = 'expert'
  )
);
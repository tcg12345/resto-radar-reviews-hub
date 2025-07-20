-- Add RLS policy to allow friends to see each other's restaurants
CREATE POLICY "Friends can view each other's restaurants"
ON public.restaurants 
FOR SELECT 
USING (
  -- Allow if the restaurant owner is a friend and has public profile or allows friend requests
  EXISTS (
    SELECT 1 FROM public.friends f
    JOIN public.profiles p ON (
      (f.user1_id = restaurants.user_id AND f.user2_id = auth.uid()) OR
      (f.user2_id = restaurants.user_id AND f.user1_id = auth.uid())
    )
    WHERE p.id = restaurants.user_id 
    AND (p.is_public = true OR p.allow_friend_requests = true)
  )
);
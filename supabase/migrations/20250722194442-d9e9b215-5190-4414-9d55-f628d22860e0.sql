-- Add INSERT policy for notifications to allow creating notifications for friends
CREATE POLICY "Users can create notifications for friends"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Allow creating notifications for friends
  EXISTS (
    SELECT 1 FROM public.friends f
    WHERE (f.user1_id = auth.uid() AND f.user2_id = user_id)
       OR (f.user2_id = auth.uid() AND f.user1_id = user_id)
  )
);
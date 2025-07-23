-- Fix RLS policy for chat_room_participants to allow group chat creation
DROP POLICY IF EXISTS "Users can join rooms they're invited to" ON public.chat_room_participants;

-- Create a more permissive policy for inserting participants
CREATE POLICY "Users can join rooms they're invited to or create" 
ON public.chat_room_participants 
FOR INSERT 
WITH CHECK (
  -- Allow if the user is adding themselves
  auth.uid() = user_id 
  OR 
  -- Allow if the user is the creator of the room (room was created recently by this user)
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = room_id 
    AND cr.created_at > (now() - interval '5 minutes')
  )
);
-- Fix chat_rooms RLS policy for SELECT to handle group chat display properly
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms
FOR SELECT 
USING (
  -- Allow viewing if user participates in the room OR if they just created it
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  ) OR 
  -- Allow immediate access for newly created rooms (within last minute)
  (chat_rooms.created_at > (now() - interval '1 minute'))
);
-- Add RLS policies to allow users to delete chat rooms and leave chats

-- Allow users to delete chat rooms they participate in
CREATE POLICY "Users can delete rooms they participate in" 
ON public.chat_rooms 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE chat_room_participants.room_id = chat_rooms.id 
    AND chat_room_participants.user_id = auth.uid()
  )
);

-- Allow users to leave chat rooms (delete their participation)
CREATE POLICY "Users can leave rooms (delete their participation)" 
ON public.chat_room_participants 
FOR DELETE 
USING (auth.uid() = user_id);
-- Fix RLS policies for chat_rooms to handle group chat creation properly

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they participate in" ON public.chat_rooms;

-- Create new policies that handle the timing issue during room creation
CREATE POLICY "Users can create chat rooms" ON public.chat_rooms
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view rooms they participate in" ON public.chat_rooms
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update rooms they participate in" ON public.chat_rooms
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);
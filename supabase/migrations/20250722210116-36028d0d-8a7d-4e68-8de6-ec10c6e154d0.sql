-- Fix infinite recursion in RLS policies by using security definer functions

-- Create security definer function to check if user participates in a room
CREATE OR REPLACE FUNCTION public.user_participates_in_room(room_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE chat_room_participants.room_id = user_participates_in_room.room_id 
    AND chat_room_participants.user_id = user_participates_in_room.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view participants of rooms they're in" ON public.chat_room_participants;
DROP POLICY IF EXISTS "Users can view messages in rooms they participate in" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to rooms they participate in" ON public.messages;

-- Create new policies using security definer function
CREATE POLICY "Users can view participants of rooms they're in" 
ON public.chat_room_participants 
FOR SELECT 
USING (public.user_participates_in_room(room_id, auth.uid()));

CREATE POLICY "Users can view messages in rooms they participate in" 
ON public.messages 
FOR SELECT 
USING (public.user_participates_in_room(room_id, auth.uid()));

CREATE POLICY "Users can send messages to rooms they participate in" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  public.user_participates_in_room(room_id, auth.uid())
);
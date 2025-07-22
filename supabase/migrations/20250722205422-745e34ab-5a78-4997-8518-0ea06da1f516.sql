-- Create chat_rooms table for organizing conversations
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Create chat_room_participants table for managing room membership
CREATE TABLE public.chat_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS on chat_room_participants
ALTER TABLE public.chat_room_participants ENABLE ROW LEVEL SECURITY;

-- Create messages table for storing chat messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_messages_room_id_created_at ON public.messages(room_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_chat_room_participants_user_id ON public.chat_room_participants(user_id);
CREATE INDEX idx_chat_room_participants_room_id ON public.chat_room_participants(room_id);

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in" 
ON public.chat_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chat rooms" 
ON public.chat_rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update rooms they participate in" 
ON public.chat_rooms 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = chat_rooms.id AND user_id = auth.uid()
  )
);

-- RLS Policies for chat_room_participants
CREATE POLICY "Users can view participants of rooms they're in" 
ON public.chat_room_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants as crp 
    WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join rooms" 
ON public.chat_room_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.chat_room_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in rooms they participate in" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to rooms they participate in" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.chat_room_participants 
    WHERE room_id = messages.room_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() = sender_id);

-- Create function to update chat room last_message_at
CREATE OR REPLACE FUNCTION public.update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_room_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_room_last_message();

-- Create function to get or create a direct message room between two users
CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Check if a DM room already exists between these two users
  SELECT cr.id INTO room_id
  FROM public.chat_rooms cr
  WHERE cr.id IN (
    SELECT crp1.room_id 
    FROM public.chat_room_participants crp1
    JOIN public.chat_room_participants crp2 ON crp1.room_id = crp2.room_id
    WHERE crp1.user_id = current_user_id 
    AND crp2.user_id = other_user_id
    GROUP BY crp1.room_id
    HAVING COUNT(*) = 2
  )
  LIMIT 1;

  -- If no room exists, create one
  IF room_id IS NULL THEN
    INSERT INTO public.chat_rooms DEFAULT VALUES RETURNING id INTO room_id;
    
    -- Add both users to the room
    INSERT INTO public.chat_room_participants (room_id, user_id) 
    VALUES (room_id, current_user_id), (room_id, other_user_id);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Fix search path security warnings for chat functions
CREATE OR REPLACE FUNCTION public.update_chat_room_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_rooms 
  SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
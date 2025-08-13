-- Create the missing get_or_create_dm_room function for chat functionality

CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid;
  existing_room_id uuid;
  new_room_id uuid;
  user1_id uuid;
  user2_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;
  
  -- Ensure consistent ordering (smaller UUID first)
  IF current_user_id < other_user_id THEN
    user1_id := current_user_id;
    user2_id := other_user_id;
  ELSE
    user1_id := other_user_id;
    user2_id := current_user_id;
  END IF;
  
  -- Check if a DM room already exists between these two users
  SELECT cr.id INTO existing_room_id
  FROM public.chat_rooms cr
  WHERE cr.is_group = false
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp1
      WHERE crp1.room_id = cr.id AND crp1.user_id = user1_id
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_room_participants crp2
      WHERE crp2.room_id = cr.id AND crp2.user_id = user2_id
    )
    AND (
      SELECT COUNT(*) FROM public.chat_room_participants crp3
      WHERE crp3.room_id = cr.id
    ) = 2; -- Ensure it's only a 2-person chat
  
  -- If room exists, return it
  IF existing_room_id IS NOT NULL THEN
    RETURN existing_room_id;
  END IF;
  
  -- Create new DM room
  INSERT INTO public.chat_rooms (is_group, name)
  VALUES (false, NULL)
  RETURNING id INTO new_room_id;
  
  -- Add both participants to the room
  INSERT INTO public.chat_room_participants (room_id, user_id)
  VALUES 
    (new_room_id, user1_id),
    (new_room_id, user2_id);
  
  RETURN new_room_id;
END;
$$;

-- Add security comment
COMMENT ON FUNCTION public.get_or_create_dm_room IS 
'Creates or returns existing direct message room between current user and specified user.
Ensures consistent participant ordering and prevents duplicate DM rooms.';
-- Fix the get_or_create_dm_room function to properly filter for non-group DM rooms
CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  room_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Check if a DM room already exists between these two users (exclude group chats)
  SELECT cr.id INTO room_id
  FROM public.chat_rooms cr
  WHERE cr.is_group = false 
    AND cr.id IN (
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
    INSERT INTO public.chat_rooms (is_group) VALUES (false) RETURNING id INTO room_id;
    
    -- Add both users to the room
    INSERT INTO public.chat_room_participants (room_id, user_id) 
    VALUES (room_id, current_user_id), (room_id, other_user_id);
  END IF;

  RETURN room_id;
END;
$function$;
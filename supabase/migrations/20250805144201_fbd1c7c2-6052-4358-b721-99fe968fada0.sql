-- Check if get_or_create_dm_room function exists, if not create it
CREATE OR REPLACE FUNCTION public.get_or_create_dm_room(other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_uuid uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;
  
  -- First, try to find existing DM room between these two users
  SELECT cr.id INTO room_uuid
  FROM chat_rooms cr
  WHERE cr.is_group = false
    AND EXISTS (
      SELECT 1 FROM chat_room_participants crp1 
      WHERE crp1.room_id = cr.id AND crp1.user_id = current_user_id
    )
    AND EXISTS (
      SELECT 1 FROM chat_room_participants crp2 
      WHERE crp2.room_id = cr.id AND crp2.user_id = other_user_id
    )
    AND (
      SELECT COUNT(*) FROM chat_room_participants crp3 
      WHERE crp3.room_id = cr.id
    ) = 2
  LIMIT 1;
  
  -- If room exists, return it
  IF room_uuid IS NOT NULL THEN
    RETURN room_uuid;
  END IF;
  
  -- Create new DM room
  INSERT INTO chat_rooms (is_group, name) 
  VALUES (false, NULL) 
  RETURNING id INTO room_uuid;
  
  -- Add both users as participants
  INSERT INTO chat_room_participants (room_id, user_id)
  VALUES 
    (room_uuid, current_user_id),
    (room_uuid, other_user_id);
  
  RETURN room_uuid;
END;
$function$;
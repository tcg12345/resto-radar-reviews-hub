-- Fix the get_lightning_fast_friend_profile function which has the missing table alias issue
-- This is the function being called from FriendProfilesContext that's causing the error

CREATE OR REPLACE FUNCTION public.get_lightning_fast_friend_profile(target_user_id uuid, requesting_user_id uuid DEFAULT auth.uid())
 RETURNS TABLE(can_view boolean, username text, name text, avatar_url text, is_public boolean, rated_count bigint, wishlist_count bigint, avg_rating numeric, recent_restaurants jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  profile_record RECORD;
  can_access BOOLEAN := false;
BEGIN
  -- Get profile and check permissions in one super-fast query with explicit column references
  SELECT 
    p.username, 
    p.name, 
    p.avatar_url, 
    p.is_public,
    (p.is_public OR EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = requesting_user_id AND f.user2_id = target_user_id)
         OR (f.user2_id = requesting_user_id AND f.user1_id = target_user_id)
    )) as has_access
  INTO profile_record
  FROM public.profiles p 
  WHERE p.id = target_user_id;
  
  IF NOT FOUND OR NOT profile_record.has_access THEN
    RETURN QUERY SELECT 
      false, profile_record.username, profile_record.name, 
      profile_record.avatar_url, profile_record.is_public,
      0::BIGINT, 0::BIGINT, 0::NUMERIC, '[]'::JSONB;
    RETURN;
  END IF;
  
  -- Lightning-fast stats query with explicit column references and proper aliases
  RETURN QUERY
  SELECT 
    true,
    profile_record.username,
    profile_record.name,
    profile_record.avatar_url,
    profile_record.is_public,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants rating_count 
       WHERE rating_count.user_id = target_user_id AND rating_count.is_wishlist = false AND rating_count.rating IS NOT NULL), 
      0
    )::BIGINT as rated_count,
    COALESCE(
      (SELECT COUNT(*) FROM public.restaurants wish_count 
       WHERE wish_count.user_id = target_user_id AND wish_count.is_wishlist = true), 
      0
    )::BIGINT as wishlist_count,
    COALESCE(
      (SELECT AVG(recent_rating.rating) FROM public.restaurants recent_rating 
       WHERE recent_rating.user_id = target_user_id AND recent_rating.is_wishlist = false AND recent_rating.rating IS NOT NULL), 
      0
    )::NUMERIC as avg_rating,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', recent_rest.id,
          'name', recent_rest.name,
          'cuisine', recent_rest.cuisine,
          'rating', recent_rest.rating,
          'created_at', recent_rest.created_at
        )
      ) FROM (
        SELECT recent_rest_sub.id, recent_rest_sub.name, recent_rest_sub.cuisine, recent_rest_sub.rating, recent_rest_sub.created_at
        FROM public.restaurants recent_rest_sub 
        WHERE recent_rest_sub.user_id = target_user_id AND recent_rest_sub.is_wishlist = false AND recent_rest_sub.rating IS NOT NULL
        ORDER BY recent_rest_sub.created_at DESC
        LIMIT 5
      ) recent_rest), 
      '[]'::JSONB
    ) as recent_restaurants;
END;
$function$
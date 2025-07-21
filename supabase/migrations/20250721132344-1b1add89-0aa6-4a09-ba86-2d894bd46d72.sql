-- Add missing unique constraints for cache tables that are used in ON CONFLICT clauses

-- Add unique constraint for friend_profile_cache table (required by build_friend_profile_cache function)
ALTER TABLE public.friend_profile_cache 
ADD CONSTRAINT friend_profile_cache_user_id_key UNIQUE (user_id);

-- Add unique constraint for friend_activity_cache table (required by invalidate_friend_caches function)  
ALTER TABLE public.friend_activity_cache 
ADD CONSTRAINT friend_activity_cache_user_friend_restaurant_key UNIQUE (user_id, friend_id, restaurant_id);
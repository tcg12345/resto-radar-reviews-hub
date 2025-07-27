-- Add database indexes to improve restaurant query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_id_created_at 
ON public.restaurants (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_id_wishlist 
ON public.restaurants (user_id, is_wishlist);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_restaurants_user_id_rating 
ON public.restaurants (user_id, rating) 
WHERE rating IS NOT NULL;

-- Add index for friend requests to reduce polling overhead
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_receiver_status 
ON public.friend_requests (receiver_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_friend_requests_sender_status 
ON public.friend_requests (sender_id, status);
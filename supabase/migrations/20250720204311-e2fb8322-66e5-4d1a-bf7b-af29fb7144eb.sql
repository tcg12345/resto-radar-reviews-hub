-- Create materialized cache table for friend activities
CREATE TABLE public.friend_activity_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- The user whose feed this is for
  friend_id UUID NOT NULL, -- The friend who created the activity
  restaurant_id UUID NOT NULL,
  activity_data JSONB NOT NULL, -- Pre-computed activity with all details
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL, -- For sorting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.friend_activity_cache ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own cached feed
CREATE POLICY "Users can view their own cached feed" 
ON public.friend_activity_cache 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for ultra-fast access
CREATE INDEX idx_friend_activity_cache_user_date 
ON public.friend_activity_cache (user_id, activity_date DESC);

CREATE INDEX idx_friend_activity_cache_friend_restaurant 
ON public.friend_activity_cache (friend_id, restaurant_id);

-- Create function to rebuild cache for a specific user
CREATE OR REPLACE FUNCTION public.rebuild_friend_activity_cache(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete existing cache for this user
  DELETE FROM public.friend_activity_cache WHERE user_id = target_user_id;
  
  -- Rebuild cache with latest friend activities
  INSERT INTO public.friend_activity_cache (user_id, friend_id, restaurant_id, activity_data, activity_date)
  SELECT 
    target_user_id as user_id,
    r.user_id as friend_id,
    r.id as restaurant_id,
    jsonb_build_object(
      'restaurant_id', r.id,
      'restaurant_name', r.name,
      'cuisine', r.cuisine,
      'rating', r.rating,
      'date_visited', r.date_visited,
      'created_at', r.created_at,
      'friend_id', r.user_id,
      'friend_username', p.username,
      'address', r.address,
      'city', r.city,
      'michelin_stars', r.michelin_stars,
      'price_range', r.price_range,
      'notes', r.notes
    ) as activity_data,
    COALESCE(r.date_visited, r.created_at) as activity_date
  FROM public.restaurants r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN public.friends f ON (
    (f.user1_id = target_user_id AND f.user2_id = r.user_id) OR
    (f.user2_id = target_user_id AND f.user1_id = r.user_id)
  )
  WHERE r.is_wishlist = false 
    AND r.rating IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ORDER BY COALESCE(r.date_visited, r.created_at) DESC
  LIMIT 100; -- Cache top 100 activities per user
END;
$$;

-- Create function to invalidate friend caches when restaurant is updated
CREATE OR REPLACE FUNCTION public.invalidate_friend_caches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Get all friends of the user who made the change
  DELETE FROM public.friend_activity_cache 
  WHERE friend_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Rebuild caches for all friends of this user
  INSERT INTO public.friend_activity_cache (user_id, friend_id, restaurant_id, activity_data, activity_date)
  SELECT 
    CASE 
      WHEN f.user1_id = COALESCE(NEW.user_id, OLD.user_id) THEN f.user2_id
      ELSE f.user1_id
    END as user_id,
    COALESCE(NEW.user_id, OLD.user_id) as friend_id,
    COALESCE(NEW.id, OLD.id) as restaurant_id,
    jsonb_build_object(
      'restaurant_id', COALESCE(NEW.id, OLD.id),
      'restaurant_name', COALESCE(NEW.name, OLD.name),
      'cuisine', COALESCE(NEW.cuisine, OLD.cuisine),
      'rating', COALESCE(NEW.rating, OLD.rating),
      'date_visited', COALESCE(NEW.date_visited, OLD.date_visited),
      'created_at', COALESCE(NEW.created_at, OLD.created_at),
      'friend_id', COALESCE(NEW.user_id, OLD.user_id),
      'friend_username', p.username,
      'address', COALESCE(NEW.address, OLD.address),
      'city', COALESCE(NEW.city, OLD.city),
      'michelin_stars', COALESCE(NEW.michelin_stars, OLD.michelin_stars),
      'price_range', COALESCE(NEW.price_range, OLD.price_range),
      'notes', COALESCE(NEW.notes, OLD.notes)
    ) as activity_data,
    COALESCE(COALESCE(NEW.date_visited, OLD.date_visited), COALESCE(NEW.created_at, OLD.created_at)) as activity_date
  FROM public.friends f
  JOIN public.profiles p ON p.id = COALESCE(NEW.user_id, OLD.user_id)
  WHERE (f.user1_id = COALESCE(NEW.user_id, OLD.user_id) OR f.user2_id = COALESCE(NEW.user_id, OLD.user_id))
    AND COALESCE(NEW.is_wishlist, OLD.is_wishlist, false) = false 
    AND COALESCE(NEW.rating, OLD.rating) IS NOT NULL
    AND (p.is_public = true OR f.id IS NOT NULL)
  ON CONFLICT (user_id, friend_id, restaurant_id) DO UPDATE SET
    activity_data = EXCLUDED.activity_data,
    activity_date = EXCLUDED.activity_date,
    updated_at = now();
    
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to maintain cache automatically
CREATE TRIGGER restaurants_cache_invalidation
  AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_friend_caches();

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_user_rating_date 
ON public.restaurants (user_id, rating, COALESCE(date_visited, created_at) DESC) 
WHERE is_wishlist = false AND rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_friends_composite 
ON public.friends (user1_id, user2_id);

CREATE INDEX IF NOT EXISTS idx_friends_reverse 
ON public.friends (user2_id, user1_id);

-- Create function for paginated friend activity with caching
CREATE OR REPLACE FUNCTION public.get_cached_friend_activity(
  requesting_user_id UUID DEFAULT auth.uid(),
  page_size INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  activity_data JSONB,
  activity_date TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    fac.activity_data,
    fac.activity_date
  FROM public.friend_activity_cache fac
  WHERE fac.user_id = requesting_user_id
  ORDER BY fac.activity_date DESC
  LIMIT page_size
  OFFSET page_offset;
$$;
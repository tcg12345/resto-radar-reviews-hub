-- Add google_place_id column to restaurants table for community reviews functionality
ALTER TABLE public.restaurants 
ADD COLUMN google_place_id text;

-- Create index for better performance when looking up by place_id
CREATE INDEX idx_restaurants_google_place_id ON public.restaurants(google_place_id);

-- Update existing restaurants to set google_place_id from any matching reviews
UPDATE public.restaurants r
SET google_place_id = (
  SELECT ur.restaurant_place_id 
  FROM public.user_reviews ur 
  WHERE ur.restaurant_name ILIKE r.name 
    AND ur.restaurant_address ILIKE '%' || r.city || '%'
  LIMIT 1
)
WHERE r.google_place_id IS NULL;
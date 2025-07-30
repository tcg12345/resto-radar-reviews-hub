-- Add photo_captions column to restaurants table to store captions for each photo
ALTER TABLE public.restaurants 
ADD COLUMN photo_captions TEXT[] DEFAULT NULL;

-- Add comment to explain the structure
COMMENT ON COLUMN public.restaurants.photo_captions IS 'Array of captions corresponding to photos array. Index matches between photos and photo_captions arrays.';

-- Also add photo_captions to place_ratings table for trip photos
ALTER TABLE public.place_ratings 
ADD COLUMN photo_captions TEXT[] DEFAULT NULL;

COMMENT ON COLUMN public.place_ratings.photo_captions IS 'Array of captions corresponding to photos array. Index matches between photos and photo_captions arrays.';
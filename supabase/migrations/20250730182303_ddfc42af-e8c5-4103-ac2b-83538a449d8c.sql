-- Add photo dish names and notes columns to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN photo_dish_names TEXT[] DEFAULT '{}',
ADD COLUMN photo_notes TEXT[] DEFAULT '{}';
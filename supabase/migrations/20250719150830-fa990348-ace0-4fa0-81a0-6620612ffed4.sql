-- Add openingHours field to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN opening_hours TEXT;
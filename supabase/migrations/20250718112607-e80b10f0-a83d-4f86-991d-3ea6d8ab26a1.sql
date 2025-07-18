-- Add michelin_stars column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN michelin_stars INTEGER CHECK (michelin_stars >= 1 AND michelin_stars <= 3);
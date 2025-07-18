-- Add price_range column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4);
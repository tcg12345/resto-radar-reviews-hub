-- Update any restaurants with price_range = 5 to 4
UPDATE public.restaurants 
SET price_range = 4 
WHERE price_range = 5;
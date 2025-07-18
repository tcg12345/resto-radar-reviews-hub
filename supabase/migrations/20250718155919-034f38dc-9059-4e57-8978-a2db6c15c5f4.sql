-- Update any restaurants with price_range = 5 to 4
UPDATE public.restaurants 
SET price_range = 4 
WHERE price_range = 5;

-- Now add the constraint limiting price range to 1-4
ALTER TABLE public.restaurants 
ADD CONSTRAINT restaurants_price_range_check 
CHECK ((price_range >= 1) AND (price_range <= 4));
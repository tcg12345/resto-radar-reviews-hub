-- Revert price range constraint back to 1-4
ALTER TABLE public.restaurants 
DROP CONSTRAINT restaurants_price_range_check;

ALTER TABLE public.restaurants 
ADD CONSTRAINT restaurants_price_range_check 
CHECK ((price_range >= 1) AND (price_range <= 4));
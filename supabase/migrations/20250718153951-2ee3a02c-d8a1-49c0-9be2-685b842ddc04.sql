-- Update all existing ratings to 2 decimal places
UPDATE public.restaurants 
SET rating = ROUND(rating::numeric, 2)
WHERE rating IS NOT NULL;

-- Verify the trigger function is working correctly
CREATE OR REPLACE FUNCTION public.round_rating_to_two_decimals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Round the rating to 2 decimal places if it's not null
  IF NEW.rating IS NOT NULL THEN
    NEW.rating := ROUND(NEW.rating::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;
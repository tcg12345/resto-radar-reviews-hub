-- Create function to round rating to 2 decimal places
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

-- Create trigger to automatically round ratings on insert/update
CREATE TRIGGER round_rating_trigger
  BEFORE INSERT OR UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.round_rating_to_two_decimals();
-- Fix the auto_link_restaurant_place_id function with proper search path
CREATE OR REPLACE FUNCTION public.auto_link_restaurant_place_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  search_name text;
  matching_place_id text;
BEGIN
  -- Only process if google_place_id is null and this is a new restaurant with rating
  IF NEW.google_place_id IS NULL AND NEW.rating IS NOT NULL AND NOT NEW.is_wishlist THEN
    -- Get the restaurant name for searching
    search_name := LOWER(TRIM(NEW.name));
    
    -- Look for existing restaurants with the same name that have a google_place_id
    SELECT google_place_id INTO matching_place_id
    FROM public.restaurants 
    WHERE google_place_id IS NOT NULL 
      AND (
        LOWER(TRIM(name)) = search_name
        OR LOWER(TRIM(name)) LIKE '%' || search_name || '%'
        OR search_name LIKE '%' || LOWER(TRIM(name)) || '%'
      )
    LIMIT 1;
    
    -- If we found a matching place_id, use it
    IF matching_place_id IS NOT NULL THEN
      NEW.google_place_id := matching_place_id;
      RAISE LOG 'Auto-linked restaurant % with google_place_id %', NEW.name, matching_place_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically link place IDs on restaurant insert/update
DROP TRIGGER IF EXISTS trigger_auto_link_restaurant_place_id ON public.restaurants;
CREATE TRIGGER trigger_auto_link_restaurant_place_id
  BEFORE INSERT OR UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_restaurant_place_id();
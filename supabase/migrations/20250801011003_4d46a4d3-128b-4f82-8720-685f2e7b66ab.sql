-- Update existing restaurants to populate google_place_id for community matching
-- This will help existing ratings show up in community reviews

-- First, let's see what restaurants exist that could match "Kalaya"
-- We'll create a function to help populate google_place_id for existing restaurants

CREATE OR REPLACE FUNCTION public.update_restaurant_google_place_id(
  restaurant_name_param text,
  restaurant_address_param text,
  google_place_id_param text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
BEGIN
  -- Update restaurants that match by name and have similar address
  UPDATE public.restaurants 
  SET google_place_id = google_place_id_param
  WHERE google_place_id IS NULL
    AND (
      LOWER(TRIM(name)) = LOWER(TRIM(restaurant_name_param))
      OR LOWER(TRIM(name)) LIKE '%' || LOWER(TRIM(restaurant_name_param)) || '%'
      OR LOWER(TRIM(restaurant_name_param)) LIKE '%' || LOWER(TRIM(name)) || '%'
    )
    AND (
      LOWER(TRIM(address)) LIKE '%' || LOWER(TRIM(SPLIT_PART(restaurant_address_param, ',', 1))) || '%'
      OR LOWER(TRIM(address)) LIKE '%' || LOWER(TRIM(SPLIT_PART(restaurant_address_param, ',', 2))) || '%'
    );
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RAISE LOG 'Updated % restaurants with google_place_id % for name % and address %', 
    updated_count, google_place_id_param, restaurant_name_param, restaurant_address_param;
    
  RETURN updated_count;
END;
$function$;

-- Update Kalaya specifically
SELECT public.update_restaurant_google_place_id(
  'Kalaya',
  '4 W Palmer St, Philadelphia, PA 19125, United States',
  'ChIJLcLGB3jHxokRtTTgXtRPs34'
);

-- Also check for some other common restaurant names that might need updating
-- This is a one-time fix for existing data
DO $$
DECLARE
  restaurant_record RECORD;
BEGIN
  -- Log what restaurants we have that don't have google_place_id set
  FOR restaurant_record IN 
    SELECT name, address, city, COUNT(*) as rating_count
    FROM public.restaurants 
    WHERE google_place_id IS NULL AND rating IS NOT NULL AND is_wishlist = false
    GROUP BY name, address, city
    ORDER BY rating_count DESC
    LIMIT 10
  LOOP
    RAISE LOG 'Restaurant without google_place_id: % at % in % (% ratings)', 
      restaurant_record.name, restaurant_record.address, restaurant_record.city, restaurant_record.rating_count;
  END LOOP;
END $$;
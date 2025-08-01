-- Fix specific case: Link Tyler's Tamarind rating with the correct place_id
UPDATE public.restaurants 
SET google_place_id = 'ChIJTUlS0S4FdkgRNcarX5NN-AM' 
WHERE name LIKE '%Tamarind%' 
  AND user_id = '755c8fd9-19fe-4109-8bd3-94295a5ea6fa' 
  AND google_place_id IS NULL;

-- Also create a more comprehensive fix for all restaurants that might have similar issues
-- Update restaurants to use the most recent place_id for restaurants with the same name
WITH latest_place_ids AS (
  SELECT 
    LOWER(TRIM(name)) as normalized_name,
    google_place_id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY created_at DESC) as rn
  FROM public.restaurants 
  WHERE google_place_id IS NOT NULL
)
UPDATE public.restaurants AS r
SET google_place_id = lpi.google_place_id
FROM latest_place_ids lpi
WHERE r.google_place_id IS NULL
  AND r.rating IS NOT NULL
  AND NOT r.is_wishlist
  AND LOWER(TRIM(r.name)) = lpi.normalized_name
  AND lpi.rn = 1;
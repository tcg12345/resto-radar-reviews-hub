-- One-time update to link existing restaurants with google_place_id
-- This will find restaurants with the same name and link them
UPDATE public.restaurants AS r1
SET google_place_id = r2.google_place_id
FROM public.restaurants AS r2
WHERE r1.google_place_id IS NULL 
  AND r2.google_place_id IS NOT NULL
  AND r1.rating IS NOT NULL
  AND NOT r1.is_wishlist
  AND (
    LOWER(TRIM(r1.name)) = LOWER(TRIM(r2.name))
    OR LOWER(TRIM(r1.name)) LIKE '%' || LOWER(TRIM(r2.name)) || '%'
    OR LOWER(TRIM(r2.name)) LIKE '%' || LOWER(TRIM(r1.name)) || '%'
  );
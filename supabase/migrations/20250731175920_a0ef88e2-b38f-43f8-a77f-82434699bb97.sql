-- Update Le Tout-Paris restaurant record to include Google Place ID for proper community stats matching
UPDATE public.restaurants 
SET google_place_id = 'ChIJxYJUC2lv5kcRlhdpWba_aGU' 
WHERE name = 'Le Tout-Paris' 
  AND google_place_id IS NULL 
  AND address = '8 Quai du Louvre, 75001 Paris, France';
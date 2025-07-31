-- Update Le Tout-Paris restaurant with its Google Place ID
UPDATE public.restaurants 
SET google_place_id = 'ChIJxYJUC2lv5kcRlhdpWba_aGU'
WHERE name ILIKE '%Le Tout-Paris%' 
AND address ILIKE '%Rue de Ponthieu%'
AND google_place_id IS NULL;
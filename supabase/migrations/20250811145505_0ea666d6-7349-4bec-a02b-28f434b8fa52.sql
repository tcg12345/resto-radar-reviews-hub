-- Link Gymkhana restaurant to correct Google Place ID
UPDATE public.restaurants 
SET google_place_id = 'ChIJtwn55ikFdkgRAvOuPIWeLM0' 
WHERE LOWER(name) LIKE '%gymkhana%' 
AND google_place_id != 'ChIJtwn55ikFdkgRAvOuPIWeLM0' 
AND rating IS NOT NULL 
AND is_wishlist = false;
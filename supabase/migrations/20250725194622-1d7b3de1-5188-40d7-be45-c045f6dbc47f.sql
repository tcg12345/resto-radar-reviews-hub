-- Update place_ratings table to support more place types
ALTER TABLE place_ratings
DROP CONSTRAINT IF EXISTS place_ratings_place_type_check;

-- Add new constraint with extended place types
ALTER TABLE place_ratings
ADD CONSTRAINT place_ratings_place_type_check 
CHECK (place_type IN (
  'restaurant', 
  'hotel', 
  'attraction', 
  'museum', 
  'park', 
  'shopping', 
  'entertainment', 
  'transport', 
  'spa', 
  'bar', 
  'cafe', 
  'beach', 
  'landmark', 
  'activity', 
  'other'
));
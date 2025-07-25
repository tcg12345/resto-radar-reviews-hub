-- Add michelin_stars column to place_ratings table
ALTER TABLE place_ratings 
ADD COLUMN michelin_stars integer;

-- Add constraint to ensure michelin_stars is between 0 and 3
ALTER TABLE place_ratings
ADD CONSTRAINT place_ratings_michelin_stars_check 
CHECK (michelin_stars IS NULL OR (michelin_stars >= 0 AND michelin_stars <= 3));
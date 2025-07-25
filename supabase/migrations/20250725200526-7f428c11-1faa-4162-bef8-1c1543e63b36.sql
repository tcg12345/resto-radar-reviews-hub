-- Add cuisine column to place_ratings table to store cuisine information
ALTER TABLE place_ratings 
ADD COLUMN cuisine text;
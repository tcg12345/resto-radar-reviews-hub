-- Add missing columns to itineraries table for complete data persistence
ALTER TABLE public.itineraries 
ADD COLUMN locations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN hotels jsonb DEFAULT '[]'::jsonb,
ADD COLUMN flights jsonb DEFAULT '[]'::jsonb,
ADD COLUMN was_created_with_length_of_stay boolean DEFAULT false,
ADD COLUMN is_multi_city boolean DEFAULT false;
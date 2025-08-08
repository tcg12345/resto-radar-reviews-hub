-- Add is_shareable column to itineraries table
ALTER TABLE public.itineraries 
ADD COLUMN is_shareable boolean NOT NULL DEFAULT true;

-- Add RLS policy to allow public access to shareable itineraries
CREATE POLICY "Anyone can view shareable itineraries" 
ON public.itineraries 
FOR SELECT 
USING (is_shareable = true);
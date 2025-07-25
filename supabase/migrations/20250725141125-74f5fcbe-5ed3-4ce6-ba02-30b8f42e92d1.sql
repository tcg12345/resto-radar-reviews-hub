-- Enable realtime for place_ratings table
ALTER TABLE public.place_ratings REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.place_ratings;
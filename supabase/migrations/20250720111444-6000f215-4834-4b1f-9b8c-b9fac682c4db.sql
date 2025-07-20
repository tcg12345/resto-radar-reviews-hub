-- Add reservation columns to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN reservable BOOLEAN DEFAULT FALSE,
ADD COLUMN reservation_url TEXT;
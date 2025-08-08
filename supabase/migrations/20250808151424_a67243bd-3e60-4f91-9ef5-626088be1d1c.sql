-- Add bio field to profiles table for user bios
ALTER TABLE public.profiles 
ADD COLUMN bio text;

-- Add home_city field to profiles table for user location
ALTER TABLE public.profiles 
ADD COLUMN home_city text;
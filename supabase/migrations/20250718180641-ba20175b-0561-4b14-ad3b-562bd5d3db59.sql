-- Add name column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Update the handle_new_user function to include name from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'name',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = NEW.raw_user_meta_data ->> 'name',
    updated_at = NOW();
  RETURN NEW;
END;
$$;
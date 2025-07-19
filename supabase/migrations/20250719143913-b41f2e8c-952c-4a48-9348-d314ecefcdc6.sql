-- Add address column to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Update the handle_new_user function to include address
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, address, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'address',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = NEW.raw_user_meta_data->>'name',
    address = NEW.raw_user_meta_data->>'address',
    updated_at = NOW();
  RETURN NEW;
END;
$$;
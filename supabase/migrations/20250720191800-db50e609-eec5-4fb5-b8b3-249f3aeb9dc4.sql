-- Create a function to check for existing users before signup
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists in auth.users table (this requires service role)
  -- Since we can't access auth.users directly, we'll check profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_to_check
  );
END;
$$;

-- Add a unique constraint on email in profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END;
$$;
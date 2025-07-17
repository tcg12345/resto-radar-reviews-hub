-- 1. Update restaurants table to require user_id and add proper constraints
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.restaurants ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.restaurants ALTER COLUMN updated_at SET DEFAULT now();
ALTER TABLE public.restaurants ALTER COLUMN is_wishlist SET DEFAULT false;

-- Backfill existing rows with a system user ID
UPDATE public.restaurants SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

-- Now make user_id required
ALTER TABLE public.restaurants ALTER COLUMN user_id SET NOT NULL;

-- 2. Update settings table to be user-specific and add constraints
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN updated_at SET DEFAULT now();

-- Backfill existing settings
UPDATE public.settings SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL;

-- Make user_id required
ALTER TABLE public.settings ALTER COLUMN user_id SET NOT NULL;

-- 3. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Restaurants are viewable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurants are insertable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurants are updatable by everyone" ON public.restaurants;
DROP POLICY IF EXISTS "Restaurants are deletable by everyone" ON public.restaurants;

DROP POLICY IF EXISTS "Settings are viewable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Settings are insertable by everyone" ON public.settings;
DROP POLICY IF EXISTS "Settings are updatable by everyone" ON public.settings;

-- 4. Create secure RLS policies for restaurants
CREATE POLICY "Users can view their own restaurants"
ON public.restaurants FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own restaurants"
ON public.restaurants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own restaurants"
ON public.restaurants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own restaurants"
ON public.restaurants FOR DELETE
USING (auth.uid() = user_id);

-- 5. Create secure RLS policies for settings
CREATE POLICY "Users can view their own settings"
ON public.settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
ON public.settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.settings FOR UPDATE
USING (auth.uid() = user_id);

-- 6. Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create secure RLS policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 8. Create trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Update handle_updated_at function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
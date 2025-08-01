-- Fix remaining function security warnings for existing functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    username, 
    phone_number, 
    address, 
    is_public, 
    allow_friend_requests,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'address',
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, false),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = NEW.raw_user_meta_data->>'name',
    username = NEW.raw_user_meta_data->>'username',
    phone_number = NEW.raw_user_meta_data->>'phone_number',
    address = NEW.raw_user_meta_data->>'address',
    is_public = COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, false),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
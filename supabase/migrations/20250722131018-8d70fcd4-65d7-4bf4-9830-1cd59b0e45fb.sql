-- CRITICAL SECURITY FIX: Update remaining database functions to include proper search_path
-- This prevents function hijacking attacks by ensuring functions only access public schema

-- Fix check_email_exists function
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Check if email exists in profiles table
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = email_to_check
  );
END;
$$;

-- Fix accept_friend_request function
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  sender_id UUID;
  receiver_id UUID;
BEGIN
  -- Get the request details
  SELECT fr.sender_id, fr.receiver_id 
  INTO sender_id, receiver_id
  FROM public.friend_requests fr 
  WHERE fr.id = request_id AND fr.receiver_id = auth.uid() AND fr.status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  -- Update the request status
  UPDATE public.friend_requests 
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship (ensure consistent ordering)
  IF sender_id < receiver_id THEN
    INSERT INTO public.friends (user1_id, user2_id) VALUES (sender_id, receiver_id);
  ELSE
    INSERT INTO public.friends (user1_id, user2_id) VALUES (receiver_id, sender_id);
  END IF;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

-- Fix round_rating_to_two_decimals function
CREATE OR REPLACE FUNCTION public.round_rating_to_two_decimals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Round the rating to 2 decimal places if it's not null
  IF NEW.rating IS NOT NULL THEN
    NEW.rating := ROUND(NEW.rating::numeric, 2);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add rate limiting table for edge function security
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits table (only if doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'rate_limits' 
    AND policyname = 'Users can view their own rate limits'
  ) THEN
    CREATE POLICY "Users can view their own rate limits" 
    ON public.rate_limits 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  target_user_id uuid,
  endpoint_name text,
  max_requests integer DEFAULT 10,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM public.rate_limits
  WHERE user_id = target_user_id
    AND endpoint = endpoint_name
    AND window_start > window_start_time;
  
  -- Clean old entries
  DELETE FROM public.rate_limits
  WHERE window_start < window_start_time;
  
  -- Check if under limit
  IF current_count >= max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (target_user_id, endpoint_name, 1, now())
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$;
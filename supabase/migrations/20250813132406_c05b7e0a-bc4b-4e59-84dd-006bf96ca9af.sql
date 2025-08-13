-- Fix critical security issue: Secure reservations table access
-- Part 1: Add restaurant_staff role to enum (must be in separate transaction)

-- First, let's create a restaurant staff role if it doesn't exist
-- This will be used to give restaurant staff access to their restaurant's reservations
DO $$ 
BEGIN
  -- Check if restaurant_staff role exists in the app_role enum
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'app_role'::regtype AND enumlabel = 'restaurant_staff') THEN
    ALTER TYPE app_role ADD VALUE 'restaurant_staff';
  END IF;
END $$;
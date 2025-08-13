-- Fix critical security vulnerability: Restaurant staff cross-restaurant data access
-- Issue: Current policy allows any restaurant_staff to access ALL restaurant reservations
-- Solution: Create restaurant-specific staff assignments and update security policies

-- Create table to link restaurant staff to specific restaurants
CREATE TABLE IF NOT EXISTS public.restaurant_staff_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id uuid NOT NULL,
  restaurant_id uuid NOT NULL,
  assigned_by uuid, -- Who assigned this staff member (admin/owner)
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  role_type text DEFAULT 'staff', -- 'staff', 'manager', 'owner'
  
  -- Ensure a staff member can't be assigned to the same restaurant twice
  UNIQUE(staff_user_id, restaurant_id)
);

-- Enable RLS on the new table
ALTER TABLE public.restaurant_staff_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_staff_assignments
CREATE POLICY "Admins can view all staff assignments" 
ON public.restaurant_staff_assignments 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view their own assignments" 
ON public.restaurant_staff_assignments 
FOR SELECT 
USING (auth.uid() = staff_user_id);

CREATE POLICY "Admins can manage staff assignments" 
ON public.restaurant_staff_assignments 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Update the security function to check restaurant-specific assignments
CREATE OR REPLACE FUNCTION public.is_restaurant_staff_for_specific_restaurant(target_restaurant_id uuid, staff_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Check if the user has restaurant_staff role AND is assigned to this specific restaurant
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.restaurant_staff_assignments rsa ON rsa.staff_user_id = ur.user_id
    WHERE ur.user_id = staff_user_id 
    AND ur.role = 'restaurant_staff'
    AND rsa.restaurant_id = target_restaurant_id
    AND rsa.is_active = true
  );
$$;

-- Drop the old vulnerable policies
DROP POLICY IF EXISTS "Restaurant staff can view restaurant reservations" ON public.reservations;
DROP POLICY IF EXISTS "Restaurant staff can update reservation status" ON public.reservations;

-- Create new secure policies that check restaurant-specific assignments
CREATE POLICY "Restaurant staff can view their restaurant reservations only" 
ON public.reservations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND
  public.is_restaurant_staff_for_specific_restaurant(restaurant_id, auth.uid())
);

CREATE POLICY "Restaurant staff can update their restaurant reservation status only" 
ON public.reservations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND
  public.is_restaurant_staff_for_specific_restaurant(restaurant_id, auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  public.is_restaurant_staff_for_specific_restaurant(restaurant_id, auth.uid())
);

-- Add security documentation
COMMENT ON TABLE public.restaurant_staff_assignments IS 
'SECURITY CRITICAL: Controls which restaurant staff can access which restaurant data. 
Each staff member must be explicitly assigned to restaurants they can manage.
This prevents cross-restaurant data access vulnerabilities.';

COMMENT ON FUNCTION public.is_restaurant_staff_for_specific_restaurant IS 
'SECURITY FUNCTION: Verifies staff can only access data for restaurants they are specifically assigned to.
Prevents unauthorized cross-restaurant data access by checking both role and restaurant assignment.';
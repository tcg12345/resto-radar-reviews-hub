-- Clear all restaurants for the current user
DELETE FROM public.restaurants WHERE user_id = auth.uid();
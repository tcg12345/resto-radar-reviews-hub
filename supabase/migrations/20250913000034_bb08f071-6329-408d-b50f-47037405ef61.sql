-- Fix search path warnings for functions
CREATE OR REPLACE FUNCTION public.create_default_restaurant_list()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.restaurant_lists (user_id, name, description, is_default)
  VALUES (NEW.id, 'All Restaurants', 'All your rated restaurants', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_add_to_default_list()
RETURNS TRIGGER AS $$
DECLARE
  default_list_id UUID;
BEGIN
  -- Only process if this is a rated restaurant (not wishlist)
  IF NEW.rating IS NOT NULL AND NEW.is_wishlist = false THEN
    -- Get the user's default list
    SELECT id INTO default_list_id 
    FROM public.restaurant_lists 
    WHERE user_id = NEW.user_id AND is_default = true 
    LIMIT 1;
    
    -- Add to default list if it exists
    IF default_list_id IS NOT NULL THEN
      INSERT INTO public.restaurant_list_items (restaurant_id, list_id)
      VALUES (NEW.id, default_list_id)
      ON CONFLICT (restaurant_id, list_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_restaurant_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
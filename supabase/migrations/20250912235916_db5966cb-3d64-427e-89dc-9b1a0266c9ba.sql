-- Create restaurant lists table
CREATE TABLE public.restaurant_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for restaurant_lists
CREATE POLICY "Users can view their own lists" 
ON public.restaurant_lists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists" 
ON public.restaurant_lists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists" 
ON public.restaurant_lists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists" 
ON public.restaurant_lists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create restaurant list items table (many-to-many relationship)
CREATE TABLE public.restaurant_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  list_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, list_id)
);

-- Enable RLS
ALTER TABLE public.restaurant_list_items ENABLE ROW LEVEL SECURITY;

-- Create policies for restaurant_list_items
CREATE POLICY "Users can view items in their lists" 
ON public.restaurant_list_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.restaurant_lists rl 
  WHERE rl.id = restaurant_list_items.list_id 
  AND rl.user_id = auth.uid()
));

CREATE POLICY "Users can add items to their lists" 
ON public.restaurant_list_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.restaurant_lists rl 
  WHERE rl.id = restaurant_list_items.list_id 
  AND rl.user_id = auth.uid()
) AND EXISTS (
  SELECT 1 FROM public.restaurants r 
  WHERE r.id = restaurant_list_items.restaurant_id 
  AND r.user_id = auth.uid()
));

CREATE POLICY "Users can remove items from their lists" 
ON public.restaurant_list_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.restaurant_lists rl 
  WHERE rl.id = restaurant_list_items.list_id 
  AND rl.user_id = auth.uid()
));

-- Create function to auto-create default "All Restaurants" list for new users
CREATE OR REPLACE FUNCTION public.create_default_restaurant_list()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.restaurant_lists (user_id, name, description, is_default)
  VALUES (NEW.id, 'All Restaurants', 'All your rated restaurants', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create default list when a user profile is created
CREATE TRIGGER create_default_list_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_restaurant_list();

-- Create function to auto-add restaurants to the default list
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-add new rated restaurants to default list
CREATE TRIGGER auto_add_restaurant_to_default_list
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_to_default_list();

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_restaurant_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_restaurant_lists_updated_at
  BEFORE UPDATE ON public.restaurant_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_restaurant_lists_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_restaurant_lists_user_id ON public.restaurant_lists(user_id);
CREATE INDEX idx_restaurant_list_items_list_id ON public.restaurant_list_items(list_id);
CREATE INDEX idx_restaurant_list_items_restaurant_id ON public.restaurant_list_items(restaurant_id);
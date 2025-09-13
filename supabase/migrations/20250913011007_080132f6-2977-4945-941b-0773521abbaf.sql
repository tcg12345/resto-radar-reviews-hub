-- Add foreign key constraint between restaurant_list_items and restaurants
ALTER TABLE public.restaurant_list_items 
ADD CONSTRAINT restaurant_list_items_restaurant_id_fkey 
FOREIGN KEY (restaurant_id) REFERENCES public.restaurants(id) ON DELETE CASCADE;

-- Add foreign key constraint between restaurant_list_items and restaurant_lists
ALTER TABLE public.restaurant_list_items 
ADD CONSTRAINT restaurant_list_items_list_id_fkey 
FOREIGN KEY (list_id) REFERENCES public.restaurant_lists(id) ON DELETE CASCADE;
-- Create restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  rating FLOAT,
  notes TEXT,
  date_visited TIMESTAMP WITH TIME ZONE,
  photos TEXT[],
  latitude FLOAT,
  longitude FLOAT,
  is_wishlist BOOLEAN DEFAULT false,
  category_ratings JSONB,
  use_weighted_rating BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- Make restaurants publicly readable for now (we can add auth later if needed)
CREATE POLICY "Restaurants are viewable by everyone" 
ON public.restaurants FOR SELECT USING (true);

CREATE POLICY "Restaurants are insertable by everyone" 
ON public.restaurants FOR INSERT WITH CHECK (true);

CREATE POLICY "Restaurants are updatable by everyone" 
ON public.restaurants FOR UPDATE USING (true);

CREATE POLICY "Restaurants are deletable by everyone" 
ON public.restaurants FOR DELETE USING (true);

-- Create settings table for storing map token
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Make settings publicly readable/writable
CREATE POLICY "Settings are viewable by everyone" 
ON public.settings FOR SELECT USING (true);

CREATE POLICY "Settings are insertable by everyone" 
ON public.settings FOR INSERT WITH CHECK (true);

CREATE POLICY "Settings are updatable by everyone" 
ON public.settings FOR UPDATE USING (true);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER set_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create place_ratings table for attractions, restaurants, hotels
CREATE TABLE public.place_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  place_id TEXT, -- Google Places ID
  place_name TEXT NOT NULL,
  place_type TEXT NOT NULL, -- 'restaurant', 'attraction', 'hotel'
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  overall_rating DOUBLE PRECISION,
  category_ratings JSONB, -- Store different category ratings
  notes TEXT,
  photos TEXT[],
  date_visited DATE,
  website TEXT,
  phone_number TEXT,
  price_range INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trips
CREATE POLICY "Users can view their own trips" 
ON public.trips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
ON public.trips 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Friends can view public trips" 
ON public.trips 
FOR SELECT 
USING (is_public = true AND EXISTS (
  SELECT 1 FROM public.friends f
  WHERE (f.user1_id = auth.uid() AND f.user2_id = trips.user_id)
     OR (f.user2_id = auth.uid() AND f.user1_id = trips.user_id)
));

-- Create RLS policies for place_ratings
CREATE POLICY "Users can view their own place ratings" 
ON public.place_ratings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own place ratings" 
ON public.place_ratings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own place ratings" 
ON public.place_ratings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own place ratings" 
ON public.place_ratings 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Friends can view public trip ratings" 
ON public.place_ratings 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.trips t
  WHERE t.id = place_ratings.trip_id 
    AND t.is_public = true 
    AND EXISTS (
      SELECT 1 FROM public.friends f
      WHERE (f.user1_id = auth.uid() AND f.user2_id = t.user_id)
         OR (f.user2_id = auth.uid() AND f.user1_id = t.user_id)
    )
));

-- Add foreign key constraints
ALTER TABLE public.place_ratings 
ADD CONSTRAINT fk_place_ratings_trip_id 
FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_place_ratings_trip_id ON public.place_ratings(trip_id);
CREATE INDEX idx_place_ratings_user_id ON public.place_ratings(user_id);
CREATE INDEX idx_place_ratings_place_type ON public.place_ratings(place_type);

-- Add update triggers
CREATE TRIGGER update_trips_updated_at
BEFORE UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_place_ratings_updated_at
BEFORE UPDATE ON public.place_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
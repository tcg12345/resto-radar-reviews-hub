-- Create table for restaurant shares
CREATE TABLE public.restaurant_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'added_to_wishlist'))
);

-- Enable RLS
ALTER TABLE public.restaurant_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for restaurant shares
CREATE POLICY "Users can view shares they sent or received"
ON public.restaurant_shares
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create shares"
ON public.restaurant_shares
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update shares they received"
ON public.restaurant_shares
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create table for notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_restaurant_shares_receiver ON public.restaurant_shares(receiver_id, created_at DESC);
CREATE INDEX idx_restaurant_shares_sender ON public.restaurant_shares(sender_id, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
-- Add username and phone number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN phone_number TEXT,
ADD COLUMN is_public BOOLEAN DEFAULT false,
ADD COLUMN allow_friend_requests BOOLEAN DEFAULT true;

-- Create friend_requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friends table (for accepted friendships)
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Enable RLS on new tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view friend requests involving them"
ON public.friend_requests 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
ON public.friend_requests 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
ON public.friend_requests 
FOR UPDATE 
USING (auth.uid() = receiver_id);

-- RLS Policies for friends
CREATE POLICY "Users can view friendships involving them"
ON public.friends 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create friendships"
ON public.friends 
FOR INSERT 
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can delete friendships involving them"
ON public.friends 
FOR DELETE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Function to handle friend request acceptance
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to get user's score based on rated restaurants
CREATE OR REPLACE FUNCTION public.get_user_score(user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.restaurants 
  WHERE user_id = $1 AND rating IS NOT NULL AND is_wishlist = false;
$$;
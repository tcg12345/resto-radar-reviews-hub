-- Add group chat support to chat_rooms table
ALTER TABLE public.chat_rooms 
ADD COLUMN name TEXT,
ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false;

-- Update existing chat rooms to be non-group chats
UPDATE public.chat_rooms SET is_group = false WHERE is_group IS NULL;
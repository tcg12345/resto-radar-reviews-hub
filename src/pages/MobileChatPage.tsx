import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MobileChatWindow } from '@/components/MobileChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function MobileChatPage() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user } = useAuth();
  const [friend, setFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (friendId && user) {
      loadFriend();
      loadMessages();
    }
  }, [friendId, user]);

  const loadFriend = async () => {
    if (!friendId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .eq('id', friendId)
        .single();

      if (error) throw error;
      setFriend(data);
    } catch (error) {
      console.error('Error loading friend:', error);
      toast.error('Failed to load friend details');
    }
  };

  const loadMessages = async () => {
    if (!friendId || !user) return;

    try {
      setIsLoading(true);
      const roomId = [user.id, friendId].sort().join('-');
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!friendId || !user) return;

    try {
      // Create or get chat room first
      const roomId = [user.id, friendId].sort().join('-');
      
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: content
        });

      if (error) throw error;
      
      // Reload messages to show the new one
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  if (!friend) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  return (
    <MobileChatWindow
      friend={friend}
      messages={messages}
      currentUserId={user?.id || ''}
      onSendMessage={sendMessage}
      isLoading={isLoading}
    />
  );
}
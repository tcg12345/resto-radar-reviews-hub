import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        // Get all chat rooms where the user is a participant with their last_read_at
        const { data: participantRooms, error: roomsError } = await supabase
          .from('chat_room_participants')
          .select('room_id, last_read_at')
          .eq('user_id', user.id);

        if (roomsError) throw roomsError;

        if (!participantRooms || participantRooms.length === 0) {
          setUnreadCount(0);
          return;
        }

        let totalUnread = 0;

        // For each room, count messages newer than last_read_at that aren't from current user
        for (const room of participantRooms) {
          const { count, error } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.room_id)
            .neq('sender_id', user.id)
            .gt('created_at', room.last_read_at || '1970-01-01');

          if (error) {
            console.error('Error counting messages for room:', error);
            continue;
          }

          totalUnread += count || 0;
        }

        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread message count:', error);
        setUnreadCount(0);
      }
    };

    fetchUnreadCount();

    // Set up real-time subscription for new messages and read status updates
    const subscription = supabase
      .channel('unread-messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          // Only count if it's not from the current user
          if (payload.new.sender_id !== user.id) {
            // Check if user is participant of this room
            const { data: participant } = await supabase
              .from('chat_room_participants')
              .select('last_read_at')
              .eq('user_id', user.id)
              .eq('room_id', payload.new.room_id)
              .single();

            // Only increment if message is newer than last read time
            if (participant && (!participant.last_read_at || payload.new.created_at > participant.last_read_at)) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_room_participants' },
        async (payload) => {
          // If the current user's last_read_at was updated, refresh count
          if (payload.new.user_id === user.id) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return unreadCount;
}
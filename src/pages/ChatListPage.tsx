import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ChatWindow } from '@/components/ChatWindow';

interface ChatRoom {
  id: string;
  last_message_at: string;
  updated_at: string;
  participants: {
    user_id: string;
    profile: {
      username: string;
      name: string;
      avatar_url: string;
    };
  }[];
  lastMessage?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
}

export function ChatListPage() {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    fetchChatRooms();
    setupRealtimeSubscription();
  }, [user]);

  const fetchChatRooms = async () => {
    if (!user) return;

    try {
      // Fetch chat rooms where user participates
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_room_participants')
        .select(`
          room_id,
          chat_rooms!inner(
            id,
            last_message_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      if (roomsError) {
        console.error('Error fetching chat rooms:', roomsError);
        return;
      }

      if (!rooms?.length) {
        setIsLoading(false);
        return;
      }

      // Get participants for each room
      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const { data: participants, error: participantsError } = await supabase
            .from('chat_room_participants')
            .select('user_id')
            .eq('room_id', room.room_id)
            .neq('user_id', user.id); // Exclude current user

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            return null;
          }

          // Get profiles for participants
          const userIds = participants?.map(p => p.user_id) || [];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, name, avatar_url')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return null;
          }

          // Get last message for this room
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, created_at')
            .eq('room_id', room.room_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: room.room_id,
            last_message_at: room.chat_rooms.last_message_at,
            updated_at: room.chat_rooms.updated_at,
            participants: profilesData?.map(profile => ({
              user_id: profile.id,
              profile: {
                username: profile.username || 'Unknown',
                name: profile.name || profile.username || 'Unknown',
                avatar_url: profile.avatar_url || ''
              }
            })) || [],
            lastMessage
          };
        })
      );

      const validRooms = roomsWithParticipants.filter(room => room !== null) as ChatRoom[];
      
      // Sort by last message time
      validRooms.sort((a, b) => 
        new Date(b.last_message_at || b.updated_at).getTime() - 
        new Date(a.last_message_at || a.updated_at).getTime()
      );

      setChatRooms(validRooms);
      
      // Auto-select first room if none selected
      if (!selectedRoomId && validRooms.length > 0) {
        setSelectedRoomId(validRooms[0].id);
      }
    } catch (error) {
      console.error('Error in fetchChatRooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('chat-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchChatRooms(); // Refresh chat rooms when messages change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          fetchChatRooms(); // Refresh when rooms change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipant = (room: ChatRoom) => {
    return room.participants[0]; // Should be the other user (not current user)
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
        
        <ScrollArea className="flex-1">
          {chatRooms.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p>No conversations yet</p>
              <p className="text-sm mt-1">Start chatting with your friends!</p>
            </div>
          ) : (
            <div className="p-2">
              {chatRooms.map((room) => {
                const otherParticipant = getOtherParticipant(room);
                const isSelected = selectedRoomId === room.id;
                
                return (
                  <Card 
                    key={room.id}
                    className={`mb-2 cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                      isSelected ? 'bg-accent border-primary' : ''
                    }`}
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage 
                            src={otherParticipant?.profile.avatar_url} 
                            alt={otherParticipant?.profile.name}
                          />
                          <AvatarFallback>
                            {otherParticipant?.profile.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate">
                              {otherParticipant?.profile.name || 'Unknown User'}
                            </h3>
                            <span className="text-xs text-muted-foreground">
                              {formatLastMessageTime(room.last_message_at || room.updated_at)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-muted-foreground truncate">
                              {room.lastMessage ? (
                                room.lastMessage.content
                              ) : (
                                'No messages yet'
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId ? (
          <ChatWindow roomId={selectedRoomId} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <h2 className="text-xl font-medium text-muted-foreground mb-2">
                Select a conversation
              </h2>
              <p className="text-muted-foreground">
                Choose a chat from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
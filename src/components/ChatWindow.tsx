import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  message_type: string;
  sender_profile?: {
    username: string;
    name: string;
    avatar_url: string;
  };
}

interface ChatParticipant {
  user_id: string;
  profile: {
    username: string;
    name: string;
    avatar_url: string;
  };
}

interface ChatWindowProps {
  roomId: string;
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    
    setIsLoading(true);
    fetchChatData();
    setupRealtimeSubscription();
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatData = async () => {
    if (!roomId || !user) return;

    try {
      // Fetch participants with proper query structure
      const { data: participantsData, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

      // Get profiles for participants
      const userIds = participantsData?.map(p => p.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      setParticipants(profilesData?.map(profile => ({
        user_id: profile.id,
        profile: {
          username: profile.username || 'Unknown',
          name: profile.name || profile.username || 'Unknown',
          avatar_url: profile.avatar_url || ''
        }
      })) || []);

      // Fetch messages with sender profiles
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, message_type')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      // Get sender profiles for messages
      const senderIds = [...new Set(messagesData?.map(msg => msg.sender_id) || [])];
      const { data: senderProfiles, error: senderProfilesError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', senderIds);

      if (senderProfilesError) {
        console.error('Error fetching sender profiles:', senderProfilesError);
        return;
      }

      const formattedMessages: Message[] = messagesData?.map(msg => {
        const senderProfile = senderProfiles?.find(p => p.id === msg.sender_id);
        return {
          id: msg.id,
          content: msg.content,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          message_type: msg.message_type,
          sender_profile: {
            username: senderProfile?.username || 'Unknown',
            name: senderProfile?.name || senderProfile?.username || 'Unknown',
            avatar_url: senderProfile?.avatar_url || ''
          }
        };
      }) || [];

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error in fetchChatData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!roomId) return;

    const channel = supabase
      .channel(`messages-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, name, avatar_url')
            .eq('id', newMessage.sender_id)
            .single();

          const formattedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            sender_id: newMessage.sender_id,
            created_at: newMessage.created_at,
            message_type: newMessage.message_type,
            sender_profile: {
              username: senderProfile?.username || 'Unknown',
              name: senderProfile?.name || senderProfile?.username || 'Unknown',
              avatar_url: senderProfile?.avatar_url || ''
            }
          };

          setMessages(prev => {
            // Remove any optimistic message with same content and sender from last 5 seconds
            const filtered = prev.filter(msg => {
              if (msg.id.startsWith('temp-') && 
                  msg.sender_id === newMessage.sender_id && 
                  msg.content === newMessage.content) {
                const msgTime = new Date(msg.created_at).getTime();
                const now = Date.now();
                return now - msgTime > 5000; // Keep if older than 5 seconds
              }
              return true;
            });
            return [...filtered, formattedMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    
    // Optimistic update - add message immediately to UI
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      content: messageContent,
      message_type: 'text',
      created_at: new Date().toISOString(),
      sender_profile: {
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast('Failed to send message');
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageContent); // Restore message content
        return;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageContent); // Restore message content
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const getOtherParticipant = () => {
    return participants.find(p => p.user_id !== user?.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={otherParticipant?.profile.avatar_url} 
              alt={otherParticipant?.profile.name}
            />
            <AvatarFallback>
              {otherParticipant?.profile.name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">
              {otherParticipant?.profile.name || 'Unknown User'}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{otherParticipant?.profile.username || 'unknown'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date} className="mb-6">
            <div className="flex justify-center mb-4">
              <span className="px-3 py-1 text-xs bg-muted rounded-full text-muted-foreground">
                {formatMessageDate(dateMessages[0].created_at)}
              </span>
            </div>
            
            {dateMessages.map((message, index) => {
              const isOwnMessage = message.sender_id === user?.id;
              const showAvatar = !isOwnMessage && (
                index === 0 || 
                dateMessages[index - 1].sender_id !== message.sender_id
              );
              
              return (
                <div
                  key={message.id}
                  className={`flex items-end space-x-2 mb-4 ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isOwnMessage && (
                    <Avatar className={`h-8 w-8 ${showAvatar ? 'visible' : 'invisible'}`}>
                      <AvatarImage 
                        src={message.sender_profile?.avatar_url} 
                        alt={message.sender_profile?.name}
                      />
                      <AvatarFallback className="text-xs">
                        {message.sender_profile?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end space-x-2">
          <Button variant="ghost" size="icon" className="shrink-0">
            <Image className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex items-end space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 resize-none"
              disabled={isSending}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || isSending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
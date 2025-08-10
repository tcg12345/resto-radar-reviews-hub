import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Users, MoreVertical, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
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

export function ChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherParticipant = participants.find(p => p.user_id !== user?.id);

  useEffect(() => {
    if (!roomId || !user) return;

    fetchChatData();
    setupRealtimeSubscription();
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatData = async () => {
    if (!roomId || !user) return;

    try {
      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        toast('Failed to load chat participants');
        return;
      }

      // Fetch profiles for participants
      if (participantsData && participantsData.length > 0) {
        const userIds = participantsData.map(p => p.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          const transformedParticipants = participantsData.map(p => {
            const profile = profilesData.find(prof => prof.id === p.user_id);
            return {
              user_id: p.user_id,
              profile: {
                username: profile?.username || '',
                name: profile?.name || '',
                avatar_url: profile?.avatar_url || ''
              }
            };
          });
          setParticipants(transformedParticipants);
        }
      }

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, message_type')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        toast('Failed to load messages');
        return;
      }

      // Fetch profiles for message senders
      if (messagesData && messagesData.length > 0) {
        const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
        const { data: senderProfilesData, error: senderProfilesError } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', senderIds);

        if (senderProfilesError) {
          console.error('Error fetching sender profiles:', senderProfilesError);
        }

        const transformedMessages = messagesData.map(m => {
          const senderProfile = senderProfilesData?.find(prof => prof.id === m.sender_id);
          return {
            ...m,
            sender_profile: senderProfile ? {
              username: senderProfile.username || '',
              name: senderProfile.name || '',
              avatar_url: senderProfile.avatar_url || ''
            } : undefined
          };
        });

        setMessages(transformedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching chat data:', error);
      toast('Failed to load chat');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          // Fetch the sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, username, name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            id: payload.new.id,
            content: payload.new.content,
            sender_id: payload.new.sender_id,
            created_at: payload.new.created_at,
            message_type: payload.new.message_type,
            sender_profile: senderProfile ? {
              username: senderProfile.username || '',
              name: senderProfile.name || '',
              avatar_url: senderProfile.avatar_url || ''
            } : undefined
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
            return [...filtered, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b pt-safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/chat-list')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            {otherParticipant && (
              <>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant.profile.avatar_url} />
                  <AvatarFallback>
                    {(otherParticipant.profile.name || otherParticipant.profile.username || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">
                    {otherParticipant.profile.name || otherParticipant.profile.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                if (otherParticipant) {
                  navigate(`/friends/${otherParticipant.user_id}`);
                }
              }}
              className="hover:bg-primary/10"
            >
              <Users className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-primary/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    if (otherParticipant) {
                      navigate(`/friends/${otherParticipant.user_id}`);
                    }
                  }}
                >
                  View Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    toast('Chat cleared locally');
                    setMessages([]);
                  }}
                >
                  Clear Chat History
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center py-2">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {formatMessageDate(dateMessages[0].created_at)}
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const isCurrentUser = message.sender_id === user?.id;
                const showAvatar = !isCurrentUser && (
                  index === 0 || 
                  dateMessages[index - 1]?.sender_id !== message.sender_id
                );

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender_profile?.avatar_url} />
                            <AvatarFallback>
                              {(message.sender_profile?.name || message.sender_profile?.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    <div className={`max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <Card className={`${
                        isCurrentUser 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </CardContent>
                      </Card>
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Image className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
              disabled={isSending}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || isSending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
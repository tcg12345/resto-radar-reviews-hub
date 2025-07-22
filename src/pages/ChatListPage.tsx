import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ChatRoom {
  id: string;
  last_message_at: string;
  other_participant: {
    id: string;
    username: string;
    name: string;
    avatar_url: string;
  };
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  unread_count: number;
}

interface Friend {
  friend_id: string;
  username: string;
  name: string;
  avatar_url: string;
}

export function ChatListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    fetchChatRooms();
    fetchFriends();
  }, [user]);

  const fetchChatRooms = async () => {
    if (!user) return;

    try {
      // Get all chat rooms the user participates in
      const { data: userRooms, error: roomsError } = await supabase
        .from('chat_room_participants')
        .select(`
          room_id,
          chat_rooms(id, last_message_at)
        `)
        .eq('user_id', user.id);

      if (roomsError) {
        console.error('Error fetching chat rooms:', roomsError);
        return;
      }

      if (!userRooms || userRooms.length === 0) {
        setChatRooms([]);
        setIsLoading(false);
        return;
      }

      const roomIds = userRooms.map(ur => ur.room_id);

      // Get other participants for each room
      const { data: allParticipants, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('room_id, user_id')
        .in('room_id', roomIds)
        .neq('user_id', user.id);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

      // Get profiles for other participants
      const otherUserIds = allParticipants?.map(p => p.user_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', otherUserIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      // Get last message for each room
      const { data: lastMessages, error: messagesError } = await supabase
        .from('messages')
        .select('room_id, content, sender_id, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error fetching last messages:', messagesError);
      }

      // Build chat rooms array
      const rooms: ChatRoom[] = userRooms.map(userRoom => {
        const roomData = Array.isArray(userRoom.chat_rooms) ? userRoom.chat_rooms[0] : userRoom.chat_rooms;
        const otherParticipant = allParticipants?.find(p => p.room_id === userRoom.room_id);
        const profile = profiles?.find(p => p.id === otherParticipant?.user_id);
        const lastMessage = lastMessages?.find(m => m.room_id === userRoom.room_id);

        return {
          id: userRoom.room_id,
          last_message_at: roomData?.last_message_at || new Date().toISOString(),
          other_participant: {
            id: profile?.id || '',
            username: profile?.username || '',
            name: profile?.name || '',
            avatar_url: profile?.avatar_url || ''
          },
          last_message: lastMessage ? {
            content: lastMessage.content,
            sender_id: lastMessage.sender_id,
            created_at: lastMessage.created_at
          } : undefined,
          unread_count: 0 // TODO: Implement unread count logic
        };
      }).filter(room => room.other_participant.id); // Filter out rooms without valid participants

      // Sort by last message time
      rooms.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      setChatRooms(rooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      toast('Failed to load chats');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data: friendsData, error } = await supabase
        .rpc('get_friends_with_scores', { requesting_user_id: user.id });

      if (error) {
        console.error('Error fetching friends:', error);
        return;
      }

      setFriends(friendsData || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const startChat = async (friendId: string) => {
    if (!user) return;

    try {
      const { data: roomId, error } = await supabase
        .rpc('get_or_create_dm_room', { other_user_id: friendId });

      if (error) {
        console.error('Error creating chat room:', error);
        toast('Failed to start chat');
        return;
      }

      setIsNewChatOpen(false);
      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast('Failed to start chat');
    }
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Messages</h1>
          </div>

          <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredFriends.map((friend) => (
                    <Card
                      key={friend.friend_id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => startChat(friend.friend_id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>
                              {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{friend.name || friend.username}</p>
                            {friend.username && friend.name && (
                              <p className="text-sm text-muted-foreground">@{friend.username}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredFriends.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No friends found' : 'No friends to chat with'}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading chats...</div>
          </div>
        ) : chatRooms.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a conversation with your friends
            </p>
            <Button onClick={() => setIsNewChatOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {chatRooms.map((room) => (
              <Card
                key={room.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/chat/${room.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={room.other_participant.avatar_url} />
                      <AvatarFallback>
                        {(room.other_participant.name || room.other_participant.username || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium truncate">
                          {room.other_participant.name || room.other_participant.username}
                        </h3>
                        <div className="flex items-center gap-2">
                          {room.unread_count > 0 && (
                            <Badge variant="default" className="text-xs">
                              {room.unread_count}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatLastMessageTime(room.last_message_at)}
                          </span>
                        </div>
                      </div>
                      {room.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {room.last_message.sender_id === user?.id ? 'You: ' : ''}
                          {room.last_message.content}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
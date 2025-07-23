import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Check, X, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MobileChatWindow } from './MobileChatWindow';
import { toast } from 'sonner';

interface ChatRoom {
  id: string;
  name?: string;
  last_message_at: string;
  updated_at: string;
  is_group: boolean;
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

interface Friend {
  friend_id: string;
  username: string;
  name: string;
  avatar_url: string;
}

export function MobileChatListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [chatToDelete, setChatToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    
    fetchChatRooms();
    fetchFriends();
    setupRealtimeSubscription();
  }, [user]);

  const fetchChatRooms = async () => {
    if (!user) return;

    try {
      const { data: rooms, error: roomsError } = await supabase
        .from('chat_room_participants')
        .select(`
          room_id,
          chat_rooms!inner(
            id,
            name,
            is_group,
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

      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const { data: participants, error: participantsError } = await supabase
            .from('chat_room_participants')
            .select('user_id')
            .eq('room_id', room.room_id)
            .neq('user_id', user.id);

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            return null;
          }

          const userIds = participants?.map(p => p.user_id) || [];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, name, avatar_url')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return null;
          }

          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, sender_id, created_at')
            .eq('room_id', room.room_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            id: room.room_id,
            name: room.chat_rooms.name,
            is_group: room.chat_rooms.is_group || false,
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
      validRooms.sort((a, b) => 
        new Date(b.last_message_at || b.updated_at).getTime() - 
        new Date(a.last_message_at || a.updated_at).getTime()
      );

      setChatRooms(validRooms);
      
      if (!selectedRoomId && validRooms.length > 0) {
        setSelectedRoomId(validRooms[0].id);
      }
    } catch (error) {
      console.error('Error in fetchChatRooms:', error);
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
      setSelectedRoomId(roomId);
      fetchChatRooms();
    } catch (error) {
      console.error('Error starting chat:', error);
      toast('Failed to start chat');
    }
  };

  const createGroupChat = async () => {
    if (!user || selectedFriends.length === 0) {
      toast('Please select at least one friend');
      return;
    }

    try {
      const { data: room, error: roomError } = await supabase
        .from('chat_rooms')
        .insert([{
          name: groupChatName.trim() || `Group with ${selectedFriends.length} friends`,
          is_group: true
        }])
        .select()
        .single();

      if (roomError) {
        console.error('Error creating group chat room:', roomError);
        toast('Failed to create group chat room');
        return;
      }

      const participantsToAdd = [user.id, ...selectedFriends];
      const { error: participantsError } = await supabase
        .from('chat_room_participants')
        .insert(
          participantsToAdd.map(userId => ({
            room_id: room.id,
            user_id: userId
          }))
        );

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        toast('Failed to add participants to group chat');
        return;
      }

      setSelectedFriends([]);
      setGroupChatName('');
      setIsNewChatOpen(false);
      setSelectedRoomId(room.id);
      fetchChatRooms();
      toast('Group chat created successfully!');
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast('Failed to create group chat');
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleDMFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) ? [] : [friendId]
    );
  };

  const deleteChat = async (roomId: string, roomName?: string) => {
    if (!user) return;

    try {
      const { data: participants, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error checking participants:', participantsError);
        toast('Failed to delete chat');
        return;
      }

      const participantCount = participants?.length || 0;
      
      if (participantCount <= 1) {
        const { error: deleteRoomError } = await supabase
          .from('chat_rooms')
          .delete()
          .eq('id', roomId);

        if (deleteRoomError) {
          console.error('Error deleting chat room:', deleteRoomError);
          toast('Failed to delete chat');
          return;
        }
      } else {
        const { error: leaveRoomError } = await supabase
          .from('chat_room_participants')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', user.id);

        if (leaveRoomError) {
          console.error('Error leaving chat room:', leaveRoomError);
          toast('Failed to leave chat');
          return;
        }
      }

      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }

      fetchChatRooms();
      
      if (participantCount <= 1) {
        toast('Chat deleted successfully');
      } else {
        toast(`Left ${roomName || 'chat'} successfully`);
      }
    } catch (error) {
      console.error('Error deleting/leaving chat:', error);
      toast('Failed to delete chat');
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
          fetchChatRooms();
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
          fetchChatRooms();
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
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getOtherParticipant = (room: ChatRoom) => {
    return room.participants.find(p => p.user_id !== user?.id);
  };

  const getChatDisplayName = (room: ChatRoom) => {
    if (room.is_group && room.name) {
      return room.name;
    } else if (room.is_group) {
      const otherParticipants = room.participants.filter(p => p.user_id !== user?.id);
      return otherParticipants.map(p => p.profile.name).join(', ');
    } else {
      const otherParticipant = getOtherParticipant(room);
      return otherParticipant?.profile.name || 'Unknown User';
    }
  };

  const getChatAvatar = (room: ChatRoom) => {
    if (room.is_group) {
      return null;
    } else {
      const otherParticipant = getOtherParticipant(room);
      return otherParticipant?.profile.avatar_url;
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  // Mobile chat view - show chat window when chat is selected
  if (selectedRoomId) {
    return <MobileChatWindow roomId={selectedRoomId} onBack={() => setSelectedRoomId(null)} />;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Messages</h1>
        </div>
        
        <Dialog 
          open={isNewChatOpen} 
          onOpenChange={(open) => {
            setIsNewChatOpen(open);
            if (!open) {
              setSelectedFriends([]);
              setGroupChatName('');
              setSearchQuery('');
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="p-2">
              <Plus className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Start New Chat</DialogTitle>
            </DialogHeader>
            
            <Tabs 
              defaultValue="dm" 
              className="w-full"
              onValueChange={() => {
                setSelectedFriends([]);
              }}
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="dm" className="text-sm">Direct Message</TabsTrigger>
                <TabsTrigger value="group" className="text-sm">Group Chat</TabsTrigger>
              </TabsList>
              
              <TabsContent value="dm" className="space-y-4">
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12"
                />
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.friend_id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFriends.includes(friend.friend_id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDMFriendSelection(friend.friend_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>
                              {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          </div>
                        </div>
                        {selectedFriends.includes(friend.friend_id) && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={() => selectedFriends.length > 0 && startChat(selectedFriends[0])}
                  disabled={selectedFriends.length === 0}
                  className="w-full h-12"
                >
                  Start Chat
                </Button>
              </TabsContent>
              
              <TabsContent value="group" className="space-y-4">
                <Input
                  placeholder="Group name (optional)"
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                  className="h-12"
                />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12"
                />
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend.friend_id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFriends.includes(friend.friend_id)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleFriendSelection(friend.friend_id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url} />
                            <AvatarFallback>
                              {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          </div>
                        </div>
                        <Checkbox
                          checked={selectedFriends.includes(friend.friend_id)}
                          className="pointer-events-none"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedFriends.length > 0 && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected friends ({selectedFriends.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFriends.map((friendId) => {
                        const friend = friends.find(f => f.friend_id === friendId);
                        return (
                          <Badge key={friendId} variant="secondary" className="text-xs">
                            {friend?.name}
                            <X
                              className="h-3 w-3 ml-1 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFriendSelection(friendId);
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
                <Button
                  onClick={createGroupChat}
                  disabled={selectedFriends.length === 0}
                  className="w-full h-12"
                >
                  Create Group Chat
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4">
          {chatRooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No chats yet</p>
              <Button onClick={() => setIsNewChatOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Start Your First Chat
              </Button>
            </div>
          ) : (
            chatRooms.map((room) => {
              const otherParticipant = getOtherParticipant(room);
              const displayName = getChatDisplayName(room);
              const avatarUrl = getChatAvatar(room);

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer transition-all hover:bg-muted/50 active:scale-[0.98]"
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {room.is_group ? (
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-6 w-6 text-primary" />
                          </div>
                        ) : (
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback>
                              {(displayName || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium truncate">{displayName}</h3>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatLastMessageTime(room.last_message_at || room.updated_at)}
                          </span>
                        </div>
                        {room.lastMessage && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-8 w-8 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete({ id: room.id, name: displayName });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Delete Chat Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{chatToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (chatToDelete) {
                  deleteChat(chatToDelete.id, chatToDelete.name);
                  setChatToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
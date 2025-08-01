import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Check, X, Trash2 } from 'lucide-react';
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
import { ChatWindow } from '@/components/ChatWindow';
import { toast } from 'sonner';

interface ChatRoom {
  id: string;
  name?: string; // For group chats
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

export function ChatListPage() {
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
      // Fetch chat rooms where user participates
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
      
      // On mobile, navigate to chat page. On desktop, select in sidebar
      if (window.innerWidth < 1024) { // lg breakpoint
        navigate(`/chat/${roomId}`);
      } else {
        setSelectedRoomId(roomId);
      }
      
      fetchChatRooms(); // Refresh to show new room
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
      console.log('Creating group chat with:', { 
        groupChatName: groupChatName.trim() || `Group with ${selectedFriends.length} friends`,
        selectedFriends,
        userId: user.id 
      });

      // Create a new group chat room
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

      console.log('Group chat room created successfully:', room);

      // Add all participants (current user + selected friends)
      const participantsToAdd = [user.id, ...selectedFriends];
      console.log('Adding participants:', participantsToAdd);

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

      // Reset form and close dialog
      setSelectedFriends([]);
      setGroupChatName('');
      setIsNewChatOpen(false);
      
      // On mobile, navigate to chat page. On desktop, select in sidebar
      if (window.innerWidth < 1024) { // lg breakpoint
        navigate(`/chat/${room.id}`);
      } else {
        setSelectedRoomId(room.id);
      }
      
      fetchChatRooms(); // Refresh to show new room
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
    // For DM, only allow selecting one friend at a time
    setSelectedFriends(prev => 
      prev.includes(friendId) ? [] : [friendId]
    );
  };

  const deleteChat = async (roomId: string, roomName?: string) => {
    if (!user) return;

    try {
      // Check how many participants are in the room
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
        // If only current user is in the room, delete the entire room
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
        // If multiple participants, just remove current user from room
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

      // If we deleted the currently selected room, clear selection
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
      }

      // Refresh chat rooms list
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
      return null; // Will show group icon
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px] bg-background flex-shrink-0"></div>
      <div className="flex flex-1 bg-background overflow-hidden">
      {/* Chat List Sidebar - Full width on mobile, sidebar on desktop */}
      <div className="w-full lg:w-80 border-r border-border flex flex-col lg:border-r-border overflow-hidden">
        <div className="flex-shrink-0 bg-background p-4 border-b border-border flex items-center justify-between">
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
          
          <Dialog 
            open={isNewChatOpen} 
            onOpenChange={(open) => {
              setIsNewChatOpen(open);
              if (!open) {
                // Clear selections when dialog closes
                setSelectedFriends([]);
                setGroupChatName('');
                setSearchQuery('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Start New Chat</DialogTitle>
              </DialogHeader>
              
              <Tabs 
                defaultValue="dm" 
                className="w-full"
                onValueChange={() => {
                  // Clear selections when switching tabs
                  setSelectedFriends([]);
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dm">Direct Message</TabsTrigger>
                  <TabsTrigger value="group">Group Chat</TabsTrigger>
                </TabsList>
                
                <TabsContent value="dm" className="space-y-4">
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredFriends.map((friend) => (
                      <Card
                        key={friend.friend_id}
                        className={`cursor-pointer transition-colors ${
                          selectedFriends.includes(friend.friend_id)
                            ? 'bg-accent border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleDMFriendSelection(friend.friend_id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedFriends.includes(friend.friend_id)}
                              onChange={() => toggleDMFriendSelection(friend.friend_id)}
                            />
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
                  {selectedFriends.length === 1 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        Ready to start chat
                      </span>
                      <Button onClick={() => startChat(selectedFriends[0])} size="sm">
                        Create Chat
                      </Button>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="group" className="space-y-4">
                  <Input
                    placeholder="Group chat name (optional)"
                    value={groupChatName}
                    onChange={(e) => setGroupChatName(e.target.value)}
                    className="w-full"
                  />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredFriends.map((friend) => (
                      <Card
                        key={friend.friend_id}
                        className={`cursor-pointer transition-colors ${
                          selectedFriends.includes(friend.friend_id)
                            ? 'bg-accent border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => toggleFriendSelection(friend.friend_id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedFriends.includes(friend.friend_id)}
                              onChange={() => toggleFriendSelection(friend.friend_id)}
                            />
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.avatar_url} />
                              <AvatarFallback>
                                {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{friend.name || friend.username}</p>
                              {friend.username && friend.name && (
                                <p className="text-xs text-muted-foreground">@{friend.username}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {selectedFriends.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                      </span>
                      <Button onClick={createGroupChat} size="sm">
                        Create Group
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
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
                const isSelected = selectedRoomId === room.id;
                
                 return (
                   <Card 
                     key={room.id}
                     className={`mb-2 cursor-pointer transition-all duration-200 hover:bg-accent/50 relative group ${
                       isSelected ? 'bg-accent border-primary' : ''
                     }`}
                     onClick={() => {
                       // On mobile, navigate to chat page. On desktop, select in sidebar
                       if (window.innerWidth < 1024) { // lg breakpoint
                         navigate(`/chat/${room.id}`);
                       } else {
                         setSelectedRoomId(room.id);
                       }
                     }}
                   >
                     <CardContent className="p-3">
                       <div className="flex items-center space-x-3">
                         {room.is_group ? (
                           <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                             <Users className="h-6 w-6 text-muted-foreground" />
                           </div>
                         ) : (
                           <Avatar className="h-12 w-12">
                             <AvatarImage 
                               src={getChatAvatar(room)} 
                               alt={getChatDisplayName(room)}
                             />
                             <AvatarFallback>
                               {getChatDisplayName(room).charAt(0)}
                             </AvatarFallback>
                           </Avatar>
                         )}
                         
                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                             <h3 className="font-medium text-sm truncate">
                               {getChatDisplayName(room)}
                             </h3>
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-muted-foreground">
                                 {formatLastMessageTime(room.last_message_at || room.updated_at)}
                               </span>
                                {/* Delete button - shows on hover */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setChatToDelete({ id: room.id, name: getChatDisplayName(room) });
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                             </div>
                           </div>
                           
                           <div className="flex items-center justify-between mt-1">
                             <p className="text-sm text-muted-foreground truncate">
                               {room.lastMessage ? (
                                 room.lastMessage.content
                               ) : (
                                 'No messages yet'
                               )}
                             </p>
                             {room.is_group && (
                               <Badge variant="secondary" className="text-xs">
                                 {room.participants.length}
                               </Badge>
                             )}
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

      {/* Chat Window - Only visible on desktop */}
      <div className="hidden lg:flex flex-1 flex-col">
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

      {/* Delete Confirmation Dialog */}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!chatToDelete} onOpenChange={() => setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the chat with "{chatToDelete?.name}"? 
              {chatRooms.find(room => room.id === chatToDelete?.id)?.participants.length === 0 
                ? ' This action cannot be undone.' 
                : ' You will leave this chat and it will continue without you.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChatToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (chatToDelete) {
                  deleteChat(chatToDelete.id, chatToDelete.name);
                  setChatToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {chatRooms.find(room => room.id === chatToDelete?.id)?.participants.length === 0 
                ? 'Delete Chat' 
                : 'Leave Chat'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
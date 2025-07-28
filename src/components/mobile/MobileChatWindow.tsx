import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Image, Trash2, Edit2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Restaurant } from '@/types/restaurant';
import { SharedRestaurantCard } from '../SharedRestaurantCard';
import { SharedItineraryCard } from '../SharedItineraryCard';

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

interface MobileChatWindowProps {
  roomId: string;
  onBack: () => void;
}

export function MobileChatWindow({ roomId, onBack }: MobileChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    
    setIsLoading(true);
    fetchChatData();
    setupRealtimeSubscription();
    markMessagesAsRead();
  }, [roomId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatData = async () => {
    if (!roomId || !user) return;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('Error fetching room data:', roomError);
        return;
      }

      setChatRoom(roomData);
      setGroupName(roomData.name || '');

      const { data: participantsData, error: participantsError } = await supabase
        .from('chat_room_participants')
        .select('user_id')
        .eq('room_id', roomId);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        return;
      }

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

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, message_type')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

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
            const filtered = prev.filter(msg => {
              if (msg.id.startsWith('temp-') && 
                  msg.sender_id === newMessage.sender_id && 
                  msg.content === newMessage.content) {
                const msgTime = new Date(msg.created_at).getTime();
                const now = Date.now();
                return now - msgTime > 5000;
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

  const markMessagesAsRead = async () => {
    if (!roomId || !user) return;

    try {
      await supabase
        .from('chat_room_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchRestaurants = async () => {
    if (!user) return;

    setIsLoadingRestaurants(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching restaurants:', error);
        toast('Failed to load restaurants');
        return;
      }

      const mappedRestaurants: Restaurant[] = data?.map(dbRestaurant => ({
        id: dbRestaurant.id,
        name: dbRestaurant.name,
        address: dbRestaurant.address,
        city: dbRestaurant.city,
        country: dbRestaurant.country,
        cuisine: dbRestaurant.cuisine,
        rating: dbRestaurant.rating,
        categoryRatings: dbRestaurant.category_ratings as any,
        useWeightedRating: dbRestaurant.use_weighted_rating,
        priceRange: dbRestaurant.price_range,
        michelinStars: dbRestaurant.michelin_stars,
        photos: dbRestaurant.photos || [],
        notes: dbRestaurant.notes,
        dateVisited: dbRestaurant.date_visited,
        latitude: dbRestaurant.latitude,
        longitude: dbRestaurant.longitude,
        website: dbRestaurant.website,
        phoneNumber: dbRestaurant.phone_number,
        openingHours: dbRestaurant.opening_hours,
        reservable: dbRestaurant.reservable,
        reservationUrl: dbRestaurant.reservation_url,
        isWishlist: dbRestaurant.is_wishlist,
        createdAt: dbRestaurant.created_at,
        updatedAt: dbRestaurant.updated_at,
        userId: dbRestaurant.user_id
      })) || [];

      setRestaurants(mappedRestaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast('Failed to load restaurants');
    } finally {
      setIsLoadingRestaurants(false);
    }
  };

  const sendRestaurantMessage = async (restaurant: Restaurant) => {
    if (!roomId || !user || isSending) return;

    setIsSending(true);
    
    const restaurantData = JSON.stringify({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      country: restaurant.country,
      cuisine: restaurant.cuisine,
      rating: restaurant.rating,
      priceRange: restaurant.priceRange,
      michelinStars: restaurant.michelinStars,
      photos: restaurant.photos,
      notes: restaurant.notes,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      website: restaurant.website,
      phone_number: restaurant.phone_number,
      openingHours: restaurant.openingHours,
      reservable: restaurant.reservable,
      reservationUrl: restaurant.reservationUrl
    });
    
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user.id,
      content: restaurantData,
      message_type: 'restaurant',
      created_at: new Date().toISOString(),
      sender_profile: {
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
        name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setIsRestaurantDialogOpen(false);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: user.id,
          content: restaurantData,
          message_type: 'restaurant'
        });

      if (error) {
        console.error('Error sending restaurant message:', error);
        toast('Failed to send restaurant');
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        return;
      }

      toast('Restaurant shared!');
    } catch (error) {
      console.error('Error sending restaurant message:', error);
      toast('Failed to send restaurant');
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !roomId || !user || isSending) return;

    setIsSending(true);
    const messageContent = newMessage.trim();
    
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
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageContent);
        return;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast('Failed to send message');
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageContent);
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

  const deleteMessage = async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) {
        console.error('Error deleting message:', error);
        toast('Failed to delete message');
        return;
      }

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast('Failed to delete message');
    }
  };

  const updateGroupInfo = async () => {
    if (!roomId || !user || !groupName.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_rooms')
        .update({ name: groupName.trim() })
        .eq('id', roomId);

      if (error) {
        console.error('Error updating group info:', error);
        toast('Failed to update group name');
        return;
      }

      setChatRoom(prev => ({ ...prev, name: groupName.trim() }));
      setIsEditGroupDialogOpen(false);
      toast('Group name updated');
    } catch (error) {
      console.error('Error updating group info:', error);
      toast('Failed to update group name');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-lg text-muted-foreground">Loading chat...</div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);
  const otherParticipant = getOtherParticipant();
  const isGroup = chatRoom?.is_group;
  const chatName = isGroup ? chatRoom?.name || 'Group Chat' : otherParticipant?.profile.name || 'Unknown User';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isGroup ? (
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={otherParticipant?.profile.avatar_url} />
                  <AvatarFallback>
                    {(otherParticipant?.profile.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold truncate text-lg">{chatName}</h1>
                {!isGroup && (
                  <p className="text-sm text-muted-foreground">Online</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="p-2">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2">
              <Video className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                {isGroup && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditGroupDialogOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Group Info
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsMembersDialogOpen(true)}>
                      <Users className="h-4 w-4 mr-2" />
                      View Members
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Clear Chat</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
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
                    className={`flex gap-3 group ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender_profile?.avatar_url} />
                            <AvatarFallback>
                              {(message.sender_profile?.name || 'U').charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    <div className={`max-w-[85%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Show sender name for group chats */}
                      {!isCurrentUser && isGroup && showAvatar && (
                        <span className="text-xs text-muted-foreground mb-1 px-3">
                          {message.sender_profile?.name}
                        </span>
                      )}
                      
                      <div className="relative">
                        {message.message_type === 'restaurant' ? (
                          <div className="max-w-sm">
                            <SharedRestaurantCard 
                              restaurantData={message.content}
                              isOwnMessage={message.sender_id === user?.id}
                            />
                          </div>
                        ) : message.message_type === 'itinerary' ? (
                          <div className="max-w-sm">
                            <SharedItineraryCard 
                              itineraryData={message.content}
                              isOwnMessage={message.sender_id === user?.id}
                            />
                          </div>
                        ) : (
                          <div className={`rounded-2xl px-4 py-3 max-w-[calc(100vw-120px)] ${
                            isCurrentUser 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap break-words word-break overflow-wrap-anywhere">{message.content}</p>
                          </div>
                        )}
                        
                        {/* Delete button for own messages */}
                        {isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                            onClick={() => setMessageToDelete(message.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      
                      <span className="text-xs text-muted-foreground mt-1 px-3">
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
      <div className="border-t p-4 bg-background">
        <div className="flex items-end gap-3">
          <Dialog open={isRestaurantDialogOpen} onOpenChange={setIsRestaurantDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="p-3 flex-shrink-0"
                onClick={fetchRestaurants}
              >
                <Image className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Share a Restaurant</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="rated" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="rated">Rated</TabsTrigger>
                  <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rated">
                  <ScrollArea className="h-60">
                    {isLoadingRestaurants ? (
                      <div className="text-center py-8 text-muted-foreground">Loading restaurants...</div>
                    ) : (
                      <div className="space-y-2">
                        {restaurants.filter(r => !r.isWishlist).map((restaurant) => (
                          <div
                            key={restaurant.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => sendRestaurantMessage(restaurant)}
                          >
                            <h4 className="font-medium">{restaurant.name}</h4>
                            <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                            {restaurant.rating && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-xs">★</span>
                                <span className="text-xs">{restaurant.rating}/5</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="wishlist">
                  <ScrollArea className="h-60">
                    {isLoadingRestaurants ? (
                      <div className="text-center py-8 text-muted-foreground">Loading restaurants...</div>
                    ) : (
                      <div className="space-y-2">
                        {restaurants.filter(r => r.isWishlist).map((restaurant) => (
                          <div
                            key={restaurant.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => sendRestaurantMessage(restaurant)}
                          >
                            <h4 className="font-medium">{restaurant.name}</h4>
                            <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
          
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="min-h-[48px] text-base rounded-full px-4"
              disabled={isSending}
            />
          </div>
          
          <Button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="p-3 rounded-full flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Delete Message Dialog */}
      <AlertDialog open={!!messageToDelete} onOpenChange={() => setMessageToDelete(null)}>
        <AlertDialogContent className="w-[95vw] max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (messageToDelete) {
                  deleteMessage(messageToDelete);
                  setMessageToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Group Info</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateGroupInfo}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-60">
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.user_id} className="flex items-center gap-3 p-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.profile.avatar_url} />
                    <AvatarFallback>
                      {participant.profile.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{participant.profile.name}</p>
                    <p className="text-sm text-muted-foreground">@{participant.profile.username}</p>
                  </div>
                  {participant.user_id === user?.id && (
                    <Badge variant="secondary" className="ml-auto">You</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
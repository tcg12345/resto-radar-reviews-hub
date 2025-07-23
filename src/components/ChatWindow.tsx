import React, { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Restaurant } from '@/types/restaurant';
import { SharedRestaurantCard } from './SharedRestaurantCard';

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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId || !user) return;
    
    setIsLoading(true);
    fetchChatData();
    setupRealtimeSubscription();
    
    // Mark messages as read when chat window opens
    markMessagesAsRead();
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

      // Map database response to Restaurant type
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
    
    // Store the full restaurant object as JSON
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
    
    // Optimistic update
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
                  
                   {message.message_type === 'restaurant' ? (
                     <div className={`${isOwnMessage ? 'flex justify-end' : 'flex justify-start'}`}>
                       <SharedRestaurantCard 
                         restaurantData={message.content}
                         isOwnMessage={isOwnMessage}
                       />
                     </div>
                   ) : (
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
                   )}
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
          <Dialog open={isRestaurantDialogOpen} onOpenChange={setIsRestaurantDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0"
                onClick={fetchRestaurants}
              >
                <Image className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Share a Restaurant</DialogTitle>
              </DialogHeader>
              
              {isLoadingRestaurants ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading restaurants...</div>
                </div>
              ) : (
                <Tabs defaultValue="rated" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="rated">
                      Rated ({restaurants.filter(r => !r.isWishlist).length})
                    </TabsTrigger>
                    <TabsTrigger value="wishlist">
                      Wishlist ({restaurants.filter(r => r.isWishlist).length})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="rated" className="mt-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {restaurants
                          .filter(r => !r.isWishlist)
                          .map(restaurant => (
                            <div
                              key={restaurant.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => sendRestaurantMessage(restaurant)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{restaurant.name}</h4>
                                  {restaurant.rating && (
                                    <Badge variant="secondary">
                                      {restaurant.rating}/10
                                    </Badge>
                                  )}
                                  {restaurant.michelinStars && (
                                    <Badge variant="outline">
                                      {'⭐'.repeat(restaurant.michelinStars)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {restaurant.cuisine} • {restaurant.address}, {restaurant.city}
                                </p>
                              </div>
                            </div>
                          ))}
                        {restaurants.filter(r => !r.isWishlist).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No rated restaurants yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="wishlist" className="mt-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {restaurants
                          .filter(r => r.isWishlist)
                          .map(restaurant => (
                            <div
                              key={restaurant.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                              onClick={() => sendRestaurantMessage(restaurant)}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{restaurant.name}</h4>
                                  {restaurant.michelinStars && (
                                    <Badge variant="outline">
                                      {'⭐'.repeat(restaurant.michelinStars)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {restaurant.cuisine} • {restaurant.address}, {restaurant.city}
                                </p>
                              </div>
                            </div>
                          ))}
                        {restaurants.filter(r => r.isWishlist).length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            No wishlist restaurants yet
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
          
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
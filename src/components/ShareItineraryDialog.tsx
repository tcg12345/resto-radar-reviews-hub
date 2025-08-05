import { useState, useEffect } from 'react';
import { Share2, Copy, Mail, MessageCircle, Users, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Itinerary } from '@/components/ItineraryBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';

interface ShareItineraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itinerary: Itinerary | null;
}

interface ChatRoom {
  id: string;
  name?: string;
  is_group: boolean;
  participants: {
    user_id: string;
    profile: {
      username: string;
      name: string;
      avatar_url: string;
    };
  }[];
}

export function ShareItineraryDialog({ isOpen, onClose, itinerary }: ShareItineraryDialogProps) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [personalMessage, setPersonalMessage] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchChatRooms();
    }
  }, [isOpen, user]);

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
            is_group
          )
        `)
        .eq('user_id', user.id);

      if (roomsError) {
        console.error('Error fetching chat rooms:', roomsError);
        return;
      }

      if (!rooms?.length) return;

      const roomsWithParticipants = await Promise.all(
        rooms.map(async (room) => {
          const { data: participants, error: participantsError } = await supabase
            .from('chat_room_participants')
            .select('user_id')
            .eq('room_id', room.room_id);

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            return null;
          }

          // Fetch profiles separately
          const participantProfiles = await Promise.all(
            (participants || []).map(async (p) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, name, avatar_url')
                .eq('id', p.user_id)
                .single();

              return {
                user_id: p.user_id,
                profile: {
                  username: profile?.username || '',
                  name: profile?.name || '',
                  avatar_url: profile?.avatar_url || ''
                }
              };
            })
          );

          return {
            id: room.room_id,
            name: room.chat_rooms.name,
            is_group: room.chat_rooms.is_group,
            participants: participantProfiles
          };
        })
      );

      setChatRooms(roomsWithParticipants.filter(Boolean) as ChatRoom[]);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  };

  if (!itinerary) return null;

  const generateShareText = () => {
    const startDate = format(itinerary.startDate, 'MMMM do, yyyy');
    const endDate = format(itinerary.endDate, 'MMMM do, yyyy');
    
    let shareText = `🗓️ ${itinerary.title}\n`;
    shareText += `📅 ${startDate} - ${endDate}\n\n`;
    
    if (itinerary.events.length > 0) {
      const eventsByDate = itinerary.events.reduce((acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      }, {} as Record<string, typeof itinerary.events>);

      Object.entries(eventsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, events]) => {
          const formattedDate = format(new Date(date), 'EEEE, MMMM do');
          shareText += `📍 ${formattedDate}\n`;
          
          events
            .sort((a, b) => a.time.localeCompare(b.time))
            .forEach(event => {
              shareText += `   ${event.time} - ${event.title}`;
              if (event.restaurantData) {
                shareText += ` 🍽️\n   📍 ${event.restaurantData.address}`;
              }
              shareText += '\n';
            });
          shareText += '\n';
        });
    }
    
    return shareText;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      toast.success('Itinerary copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Trip Itinerary: ${itinerary.title}`);
    const body = encodeURIComponent(
      (message ? message + '\n\n' : '') + generateShareText()
    );
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    
    window.open(mailto, '_blank');
    toast.success('Email app opened');
  };

  const handleSMSShare = () => {
    const text = encodeURIComponent(
      (message ? message + '\n\n' : '') + generateShareText()
    );
    const sms = `sms:?body=${text}`;
    
    window.open(sms, '_blank');
    toast.success('SMS app opened');
  };

  const handleSocialShare = () => {
    if (navigator.share) {
      navigator.share({
        title: itinerary.title,
        text: generateShareText(),
      }).catch(error => {
        console.error('Error sharing:', error);
        handleCopyToClipboard();
      });
    } else {
      handleCopyToClipboard();
    }
  };

  const shareToFriends = async () => {
    if (!user || selectedFriends.length === 0) return;

    setIsSharing(true);
    try {
      const itineraryData = JSON.stringify({
        id: itinerary.id,
        title: itinerary.title,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        events: itinerary.events,
        message: personalMessage
      });

      // Create notifications for each selected friend
      const notifications = selectedFriends.map(friendId => ({
        user_id: friendId,
        title: 'Itinerary Shared',
        message: `${user.user_metadata?.name || user.email} shared an itinerary with you: ${itinerary.title}`,
        type: 'itinerary_share',
        data: { 
          itinerary: itineraryData, 
          sender_id: user.id,
          sender_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Someone',
          itinerary_title: itinerary.title
        }
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;

      toast.success(`Itinerary shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
      setSelectedFriends([]);
      setPersonalMessage('');
    } catch (error) {
      console.error('Error sharing to friends:', error);
      toast.error('Failed to share itinerary');
    }
    setIsSharing(false);
  };

  const shareToChats = async () => {
    if (!user || selectedChats.length === 0) return;

    setIsSharing(true);
    try {
      const itineraryData = {
        id: itinerary.id,
        title: itinerary.title,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        events: itinerary.events,
        message: personalMessage,
        sender_id: user.id,
        sender_name: user.user_metadata?.name || user.email?.split('@')[0] || 'Someone',
        itinerary_title: itinerary.title
      };

      // Send message to each selected chat
      const messages = selectedChats.map(chatId => ({
        room_id: chatId,
        sender_id: user.id,
        content: JSON.stringify(itineraryData),
        message_type: 'itinerary'
      }));

      const { error } = await supabase
        .from('messages')
        .insert(messages);

      if (error) throw error;

      toast.success(`Itinerary shared to ${selectedChats.length} chat${selectedChats.length > 1 ? 's' : ''}!`);
      setSelectedChats([]);
      setPersonalMessage('');
    } catch (error) {
      console.error('Error sharing to chats:', error);
      toast.error('Failed to share itinerary');
    }
    setIsSharing(false);
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const toggleChatSelection = (chatId: string) => {
    setSelectedChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const getChatDisplayName = (chat: ChatRoom) => {
    if (chat.is_group) {
      return chat.name || 'Group Chat';
    }
    const otherParticipant = chat.participants.find(p => p.user_id !== user?.id);
    return otherParticipant?.profile.name || 'Unknown User';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Itinerary
          </DialogTitle>
          <DialogDescription>
            Share your trip itinerary with friends and family
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="external" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="external">External</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="chats">Chats</TabsTrigger>
          </TabsList>

          {/* External Sharing */}
          <TabsContent value="external" className="space-y-4">
            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  This is how your itinerary will look when shared
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
                    {generateShareText()}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </Button>
              <Button
                variant="outline"
                onClick={handleSocialShare}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button
                variant="outline"
                onClick={handleSMSShare}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Send SMS
              </Button>
            </div>

            {/* Email Share */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter recipient's email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
              
              <Button
                onClick={handleEmailShare}
                disabled={!email.trim()}
                className="w-full flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
            </div>
          </TabsContent>

          {/* Share to Friends */}
          <TabsContent value="friends" className="space-y-4">
            <div className="space-y-2">
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
              />
            </div>

            <ScrollArea className="h-60">
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleFriendSelection(friend.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.includes(friend.id)}
                      onChange={() => toggleFriendSelection(friend.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback>
                        {(friend.name || friend.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{friend.name || friend.username}</p>
                      <p className="text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {friend.score} restaurants
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={shareToFriends}
              disabled={selectedFriends.length === 0 || isSharing}
              className="w-full flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Share to {selectedFriends.length} Friend{selectedFriends.length !== 1 ? 's' : ''}
            </Button>
          </TabsContent>

          {/* Share to Chats */}
          <TabsContent value="chats" className="space-y-4">
            <div className="space-y-2">
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message..."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
              />
            </div>

            <ScrollArea className="h-60">
              <div className="space-y-2">
                {chatRooms.map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleChatSelection(chat.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChats.includes(chat.id)}
                      onChange={() => toggleChatSelection(chat.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    {chat.is_group ? (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={chat.participants.find(p => p.user_id !== user?.id)?.profile.avatar_url || ''} />
                        <AvatarFallback>
                          {getChatDisplayName(chat).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getChatDisplayName(chat)}</p>
                      <p className="text-xs text-muted-foreground">
                        {chat.is_group ? `${chat.participants.length} members` : 'Direct message'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={shareToChats}
              disabled={selectedChats.length === 0 || isSharing}
              className="w-full flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Share to {selectedChats.length} Chat{selectedChats.length !== 1 ? 's' : ''}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
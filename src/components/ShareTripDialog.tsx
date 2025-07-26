import { useState } from 'react';
import { Send, Users, Search, Copy, Mail, MessageSquare, Globe, ExternalLink, Link, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips, Trip } from '@/hooks/useTrips';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ShareTripDialogProps {
  trip: Trip;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareTripDialog({ trip, isOpen, onOpenChange }: ShareTripDialogProps) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const { updateTrip } = useTrips();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isUpdatingPublic, setIsUpdatingPublic] = useState(false);

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => 
    friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    setIsUpdatingPublic(true);
    try {
      await updateTrip(trip.id, { is_public: isPublic });
      toast.success(isPublic ? 'Trip is now public' : 'Trip is now private');
    } catch (error) {
      toast.error('Failed to update trip visibility');
    } finally {
      setIsUpdatingPublic(false);
    }
  };

  const handleShareWithFriends = async () => {
    if (!user || selectedFriends.length === 0) {
      toast.error('Please select at least one friend to share with');
      return;
    }

    setIsSharing(true);

    try {
      // Create notifications for each selected friend
      const sharePromises = selectedFriends.map(async (friendId) => {
        const friend = friends.find(f => f.id === friendId);
        
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: friendId,
            type: 'trip_share',
            title: 'Trip Shared With You',
            message: `${user.user_metadata?.name || user.email} shared their trip "${trip.title}" with you${message ? `: ${message}` : ''}`,
            data: {
              trip_id: trip.id,
              trip_title: trip.title,
              trip_destination: trip.destination,
              sender_id: user.id,
              sender_name: user.user_metadata?.name || user.email,
              share_message: message.trim() || null
            }
          });

        if (error) throw error;
      });

      await Promise.all(sharePromises);

      toast.success(`Trip shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
      
      // Reset form
      setSelectedFriends([]);
      setMessage('');
    } catch (error) {
      console.error('Error sharing trip:', error);
      toast.error('Failed to share trip');
    } finally {
      setIsSharing(false);
    }
  };

  const getShareUrl = () => {
    return `${window.location.origin}/shared-trip/${trip.id}`;
  };

  const handleCopyLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleEmailShare = () => {
    const url = getShareUrl();
    const subject = `Check out my ${trip.destination} trip`;
    const body = `I wanted to share my trip to ${trip.destination} with you!\n\n${trip.description || ''}\n\nView it here: ${url}`;
    
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  const handleSocialShare = (platform: string) => {
    const url = getShareUrl();
    const text = `Check out my ${trip.destination} trip!`;
    
    let shareUrl = '';
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const handleNativeShare = async () => {
    if (!trip.is_public) {
      toast.error('Please make the trip public first to share it');
      return;
    }

    const url = getShareUrl();
    const text = `Check out my ${trip.destination} trip! ${trip.description || ''}`;

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: `${trip.title} - ${trip.destination}`,
          text: text,
          url: url,
          dialogTitle: 'Share Trip'
        });
        toast.success('Shared successfully!');
      } else {
        // Fallback for web - use Web Share API if available
        if (navigator.share) {
          await navigator.share({
            title: `${trip.title} - ${trip.destination}`,
            text: text,
            url: url
          });
          toast.success('Shared successfully!');
        } else {
          // Fallback to copying to clipboard
          await navigator.clipboard.writeText(`${text}\n\n${url}`);
          toast.success('Trip details copied to clipboard!');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // If user cancels sharing, don't show error
      if (error !== 'AbortError' && !error.toString().includes('cancel')) {
        toast.error('Failed to share trip');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Trip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Trip Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-semibold text-sm">{trip.title}</h3>
            <p className="text-xs text-muted-foreground">{trip.destination}</p>
            {trip.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{trip.description}</p>
            )}
          </div>

          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Friends
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-4">
              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="share-message">Add a message (optional)</Label>
                <Textarea
                  id="share-message"
                  placeholder="Tell your friends about this trip..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/500
                </p>
              </div>

              <Separator />

              {/* Friends List */}
              <div className="space-y-3">
                <Label>Select friends to share with:</Label>
                
                {friends.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No friends to share with yet</p>
                    <p className="text-xs">Add friends to start sharing trips!</p>
                  </div>
                ) : (
                  <>
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search friends..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Friends List */}
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredFriends.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-sm">No friends found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        filteredFriends.map((friend) => (
                          <div
                            key={friend.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                              selectedFriends.includes(friend.id)
                                ? 'bg-primary/10 border border-primary/20'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleFriendToggle(friend.id)}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {friend.username?.charAt(0).toUpperCase() || friend.name?.charAt(0).toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {friend.name || friend.username}
                              </p>
                              {friend.name && friend.username && (
                                <p className="text-xs text-muted-foreground truncate">
                                  @{friend.username}
                                </p>
                              )}
                            </div>

                            <div className={`w-4 h-4 rounded border-2 transition-colors ${
                              selectedFriends.includes(friend.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            }`}>
                              {selectedFriends.includes(friend.id) && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Share Button */}
              <Button
                onClick={handleShareWithFriends}
                disabled={selectedFriends.length === 0 || isSharing || friends.length === 0}
                className="w-full"
              >
                {isSharing ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sharing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Share with {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''}
                  </div>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="public" className="space-y-4">
              {/* Public Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Make trip public</Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view your trip
                  </p>
                </div>
                <Switch
                  checked={trip.is_public}
                  onCheckedChange={handleTogglePublic}
                  disabled={isUpdatingPublic}
                />
              </div>

              {trip.is_public && (
                <>
                  {/* Share Link */}
                  <div className="space-y-2">
                    <Label>Share link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={getShareUrl()}
                        readOnly
                        className="flex-1"
                      />
                      <Button variant="outline" size="sm" onClick={handleCopyLink}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Native Share Button */}
                  <Button
                    onClick={handleNativeShare}
                    disabled={!trip.is_public}
                    className="w-full mb-3 bg-primary hover:bg-primary/90"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Share to Apps (iMessage, WhatsApp, etc.)
                  </Button>

                  {/* External Sharing Options */}
                  <div className="space-y-3">
                    <Label>Share externally</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={handleEmailShare}
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSocialShare('whatsapp')}
                        className="flex items-center gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSocialShare('twitter')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Twitter
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleSocialShare('facebook')}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Facebook
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {!trip.is_public && (
                <div className="text-center py-6 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Enable public sharing to get a shareable link</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
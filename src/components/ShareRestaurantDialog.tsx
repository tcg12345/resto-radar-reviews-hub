import { useState } from 'react';
import { Send, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Restaurant } from '@/types/restaurant';

interface ShareRestaurantDialogProps {
  restaurant: Restaurant;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareRestaurantDialog({ restaurant, isOpen, onOpenChange }: ShareRestaurantDialogProps) {
  const { user } = useAuth();
  const { friends } = useFriends();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (!user || selectedFriends.length === 0) {
      toast.error('Please select at least one friend to share with');
      return;
    }

    setIsSharing(true);

    try {
      // Create shares for each selected friend
      const sharePromises = selectedFriends.map(async (friendId) => {
        // Create the restaurant share
        const { error: shareError } = await supabase
          .from('restaurant_shares')
          .insert({
            sender_id: user.id,
            receiver_id: friendId,
            restaurant_id: restaurant.id,
            message: message.trim() || null
          });

        if (shareError) throw shareError;

        // Create notification for the friend
        const friend = friends.find(f => f.id === friendId);
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: friendId,
            type: 'restaurant_share',
            title: 'New Restaurant Recommendation',
            message: `${user.user_metadata?.name || user.email} shared "${restaurant.name}" with you${message ? `: ${message}` : ''}`,
            data: {
              restaurant_id: restaurant.id,
              restaurant_name: restaurant.name,
              sender_id: user.id,
              sender_name: user.user_metadata?.name || user.email,
              share_message: message.trim() || null
            }
          });

        if (notificationError) throw notificationError;
      });

      await Promise.all(sharePromises);

      toast.success(`Restaurant shared with ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
      
      // Reset form
      setSelectedFriends([]);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error sharing restaurant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to share restaurant: ${errorMessage}`);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share Restaurant
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Restaurant Info */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <h3 className="font-semibold text-sm">{restaurant.name}</h3>
            <p className="text-xs text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
            {restaurant.rating && (
              <p className="text-xs text-muted-foreground">Rated {restaurant.rating}/10</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="share-message">Add a message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Why do you recommend this restaurant?"
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
                <p className="text-xs">Add friends to start sharing restaurants!</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {friends.map((friend) => (
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
                ))}
              </div>
            )}
          </div>

          {/* Share Button */}
          <Button
            onClick={handleShare}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
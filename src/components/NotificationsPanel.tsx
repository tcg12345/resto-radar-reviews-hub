import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, Heart, Check, X, Clock, Trash2, MessageSquare, Reply } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  created_at: string;
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const { addRestaurant } = useRestaurants();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        
        setNotifications(data || []);
        setUnreadCount(data?.filter((n: Notification) => !n.read_at).length || 0);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();

    // Set up real-time subscription for new notifications only
    const subscription = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Add new notification to the list only if it doesn't exist
          setNotifications(prev => {
            const exists = prev.some(n => n.id === payload.new.id);
            if (exists) return prev;
            return [payload.new as Notification, ...prev];
          });
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast(payload.new.title, {
            description: payload.new.message,
          });
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Remove deleted notification from local state
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          
          // Update unread count if the deleted notification was unread
          if (!payload.old.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Update notification in local state
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
          );
          
          // Update unread count if read status changed
          if (payload.old.read_at === null && payload.new.read_at !== null) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(0);
      
      toast('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleAddToWishlist = async (notificationId: string, restaurantId: string) => {
    try {
      // Find the notification
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      // Update share status
      const { error: shareError } = await supabase
        .from('restaurant_shares')
        .update({ status: 'added_to_wishlist' })
        .eq('restaurant_id', restaurantId)
        .eq('receiver_id', user?.id);
      
      if (shareError) throw shareError;
      
      // Add to wishlist
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      
      if (error) throw error;
      
      await addRestaurant({
        name: data.name,
        address: data.address,
        city: data.city,
        country: data.country || undefined,
        cuisine: data.cuisine,
        notes: notification.data?.share_message || data.notes || '',
        isWishlist: true,
        priceRange: data.price_range || undefined,
        michelinStars: data.michelin_stars || undefined,
        phone_number: data.phone_number || undefined,
        photos: [] // Empty since we're adding to wishlist
      });
      
      // Mark notification as read
      await markAsRead(notificationId);
      
      toast('Restaurant added to your wishlist!');
      
      // Close popover
      setOpen(false);
      
      // Navigate to wishlist
      navigate('/wishlist');
    } catch (error) {
      console.error('Error adding restaurant to wishlist:', error);
      toast.error('Failed to add restaurant to wishlist. Please try again.');
    }
  };

  const handleViewRestaurant = async (notificationId: string, restaurantId: string) => {
    // Mark as read
    await markAsRead(notificationId);
    
    // Get the notification to find the sender ID
    const notification = notifications.find(n => n.id === notificationId);
    const senderId = notification?.data?.sender_id;
    
    // Update share status
    try {
      await supabase
        .from('restaurant_shares')
        .update({ status: 'viewed' })
        .eq('restaurant_id', restaurantId)
        .eq('receiver_id', user?.id);
    } catch (error) {
      console.error('Error updating share status:', error);
    }
    
    // Close popover
    setOpen(false);
    
    // Navigate to restaurant with sender ID as friendId
    navigate(`/restaurant/${restaurantId}?friendId=${senderId}`);
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // First check if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      const wasUnread = deletedNotification && !deletedNotification.read_at;
      
      // Delete from database - this ensures permanent deletion
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast('Notification deleted permanently');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const showFullMessage = (message: string, notification: Notification) => {
    setSelectedMessage(message);
    setSelectedNotification(notification);
    setMessageDialogOpen(true);
    setOpen(false); // Close the notifications panel when opening message dialog
    // Reset reply form state
    setShowReplyForm(false);
    setReplyMessage('');
  };

  const handleMessageDialogClose = (open: boolean) => {
    setMessageDialogOpen(open);
    if (!open) {
      // When message dialog closes, reopen the notifications panel
      setOpen(true);
    }
  };

  const handleSendReply = async () => {
    if (!user || !selectedNotification || !replyMessage.trim()) return;
    
    const senderId = selectedNotification.data?.sender_id;
    if (!senderId) {
      toast.error('Cannot determine recipient');
      return;
    }
    
    setIsReplying(true);
    try {
      // Create a notification for the sender
      const notificationData = {
        user_id: senderId,
        type: 'message_reply',
        title: `${user.user_metadata?.name || 'Someone'} replied to your message`,
        message: `Reply: ${replyMessage.substring(0, 50)}${replyMessage.length > 50 ? '...' : ''}`,
        data: {
          sender_id: user.id,
          sender_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          original_notification_id: selectedNotification.id,
          reply_message: replyMessage,
          restaurant_id: selectedNotification.data?.restaurant_id,
          restaurant_name: selectedNotification.data?.restaurant_name
        }
      };
      
      const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);
        
      if (error) throw error;
      
      toast.success('Reply sent successfully!');
      setShowReplyForm(false);
      setReplyMessage('');
      
      // Close the dialog
      setMessageDialogOpen(false);
      // Reopen the notifications panel
      setOpen(true);
      
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const pastDate = new Date(date);
    const diffMilliseconds = now.getTime() - pastDate.getTime();
    const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));
    const diffHours = Math.floor(diffMilliseconds / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMilliseconds / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Format as date if older than a week
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return pastDate.toLocaleDateString(undefined, options);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className={`
          p-0 overflow-hidden flex flex-col
          md:w-80 md:max-h-[500px]
          w-[95vw] max-w-sm max-h-[70vh]
        `}
      >
        <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 md:h-8 md:px-3" onClick={markAllAsRead}>
              <Check className="h-3 w-3 mr-1 md:h-3.5 md:w-3.5" />
              <span className="hidden md:inline">Mark all read</span>
              <span className="md:hidden">Read all</span>
            </Button>
          )}
        </div>
        
        <Separator />
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm mt-2 text-muted-foreground">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 md:p-8 text-center">
              <Bell className="h-6 w-6 md:h-8 md:w-8 mx-auto opacity-50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`relative p-3 md:p-4 border-l-2 md:border-l-4 ${!notification.read_at 
                    ? 'border-l-primary bg-primary/5' 
                    : 'border-l-muted bg-background'
                  } ${notification.type === 'restaurant_share' 
                    ? 'cursor-pointer hover:bg-muted/30 transition-all duration-200 active:bg-muted/40' 
                    : ''
                  }`}
                  onClick={() => notification.type === 'restaurant_share' && handleViewRestaurant(notification.id, notification.data?.restaurant_id)}
                >
                  {/* Unread indicator */}
                  {!notification.read_at && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></div>
                  )}
                  
                  <div className="flex items-start gap-2 md:gap-3">
                    {/* Avatar - Smaller on mobile */}
                    <Avatar className="h-8 w-8 md:h-10 md:w-10 ring-1 md:ring-2 ring-background shadow-sm flex-shrink-0">
                      <AvatarImage src={''} />
                      <AvatarFallback className="text-xs md:text-sm bg-primary/10 text-primary font-semibold">
                        {notification.data?.sender_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2">
                      {/* Header with sender name - More compact on mobile */}
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span className="text-xs md:text-sm font-semibold text-foreground truncate">
                          {notification.data?.sender_name || 'Someone'}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">shared</span>
                      </div>
                      
                      {/* Restaurant card - More compact on mobile */}
                      {notification.type === 'restaurant_share' && (
                        <div className="bg-background rounded-md md:rounded-lg border p-2 md:p-3 shadow-sm w-full">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground text-xs md:text-sm truncate">
                                {notification.data?.restaurant_name || 'Restaurant'}
                              </h4>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 md:h-8 text-xs px-2 md:px-3 pointer-events-none shrink-0"
                            >
                              <Eye className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                              <span className="hidden md:inline">View</span>
                              <span className="md:hidden">Tap</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Footer with time and actions - More compact on mobile */}
                      <div className="flex justify-between items-center pt-0.5 md:pt-1">
                        <span className="text-xs text-muted-foreground flex items-center">
                          <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {/* Show message button if there's a message */}
                          {notification.data?.share_message && (
                            <div className="flex items-center gap-1 md:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-6 md:h-7 px-1.5 md:px-2 text-xs border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  showFullMessage(notification.data.share_message, notification);
                                }}
                              >
                                <MessageSquare className="h-2.5 w-2.5 md:h-3 md:w-3 mr-0.5 md:mr-1" />
                                <span className="text-xs hidden md:inline">Message</span>
                                <span className="text-xs md:hidden">Msg</span>
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-6 w-6 md:h-7 md:w-7 p-0 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                <span className="sr-only">Delete notification</span>
                              </Button>
                            </div>
                          )}
                          
                          {!notification.data?.share_message && (
                            <div className="flex items-center gap-1 md:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-6 w-6 md:h-7 md:w-7 p-0 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                <span className="sr-only">Delete notification</span>
                              </Button>
                              
                              {!notification.read_at && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-6 w-6 md:h-7 md:w-7 p-0 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <Check className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                  <span className="sr-only">Mark as read</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
      
      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={handleMessageDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Full Message</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-muted/30 rounded-lg max-w-full overflow-hidden">
            <p className="text-sm whitespace-pre-wrap break-all hyphens-auto max-w-full">
              {selectedMessage}
            </p>
          </div>
          
          {!showReplyForm ? (
            <Button 
              variant="outline" 
              className="mt-2 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
              onClick={() => setShowReplyForm(true)}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
          ) : (
            <div className="mt-4 space-y-3">
              <textarea 
                className="w-full p-3 border rounded-md text-sm resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Type your reply here..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={isReplying}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReplyForm(false)}
                  disabled={isReplying}
                >
                  Cancel
                </Button>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || isReplying}
                >
                  {isReplying ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
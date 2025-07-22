import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Eye, Heart, Check, X, Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

    // Set up real-time subscription
    const subscription = supabase
      .channel('notifications-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Add new notification to the list
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for new notification
          toast(payload.new.title, {
            description: payload.new.message,
          });
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
      <PopoverContent align="end" className="w-80 p-0 max-h-[500px] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={markAllAsRead}>
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all read
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
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto opacity-50" />
              <p className="mt-2 text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 ${!notification.read_at ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {notification.type === 'restaurant_share' && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={''} />
                        <AvatarFallback className="text-xs bg-secondary">
                          {notification.data?.sender_name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1">{notification.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.type === 'restaurant_share' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs flex-1 px-2"
                            onClick={() => handleViewRestaurant(notification.id, notification.data?.restaurant_id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs flex-1 px-2"
                            onClick={() => handleAddToWishlist(notification.id, notification.data?.restaurant_id)}
                          >
                            <Heart className="h-3 w-3 mr-1" />
                            Add to Wishlist
                          </Button>
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        
                        {!notification.read_at && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-3 w-3" />
                            <span className="sr-only">Mark as read</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
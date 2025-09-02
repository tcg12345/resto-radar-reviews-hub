import { useState, useEffect, useRef, memo } from 'react';
import { Star, MapPin, ChefHat, Eye, MessageCircle, User, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { ExpertBadge } from '@/components/ExpertBadge';

interface FriendCardProps {
  friend: {
    id: string;
    username: string;
    name?: string;
    avatar_url?: string;
    is_public: boolean;
    score?: number;
    restaurant_count?: number;
    wishlist_count?: number;
  };
  onViewProfile: (friend: any) => void;
  onChat: (friend: any) => void;
  onRemove: (friendId: string) => void;
  className?: string;
}

function FriendCardComponent({ friend, onViewProfile, onChat, onRemove, className }: FriendCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { getFriendProfile } = useFriendProfiles();
  const { isExpert } = useUserRole(friend.id);
  const [counts, setCounts] = useState({
    rated: friend.restaurant_count ?? 0,
    wishlist: friend.wishlist_count ?? 0,
  });

  useEffect(() => {
    if (counts.rated || counts.wishlist) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        // Try context cache first for instant stats
        const cached = getFriendProfile(friend.id);
        if (cached) {
          setCounts({ rated: cached.rated_count, wishlist: cached.wishlist_count });
        } else {
          // Fallback: quick RPC for counts only
          supabase.rpc('get_user_stats', { target_user_id: friend.id })
            .then(({ data }) => {
              if (Array.isArray(data) && data[0]) {
                setCounts({ rated: Number(data[0].rated_count) || 0, wishlist: Number(data[0].wishlist_count) || 0 });
              }
            })
            
        }
        observer.disconnect();
      }
    }, { rootMargin: '200px' });

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [friend.id, counts.rated, counts.wishlist, getFriendProfile]);

  return (
    <Card ref={cardRef} 
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-l-4 border-l-primary/20 hover:border-l-primary",
        "bg-gradient-to-br from-background to-muted/30",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10 transition-all group-hover:ring-primary/30">
                <AvatarImage src={friend.avatar_url || ''} loading="lazy" decoding="async" />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                  {friend.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                  @{friend.username}
                </h3>
                {isExpert && <ExpertBadge size="sm" />}
              </div>
              {friend.name && (
                <p className="text-sm text-muted-foreground">{friend.name}</p>
              )}
              <Badge 
                variant={friend.is_public ? "default" : "secondary"} 
                className="mt-1 text-xs"
              >
                {friend.is_public ? 'Public' : 'Private'}
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  isHovered && "opacity-100"
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewProfile(friend)}>
                <User className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChat(friend)}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Start Chat
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onRemove(friend.id)}
                className="text-destructive focus:text-destructive"
              >
                <User className="mr-2 h-4 w-4" />
                Remove Friend
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <ChefHat className="h-4 w-4 text-primary mr-1" />
              <span className="font-semibold text-lg">{counts.rated}</span>
            </div>
            <p className="text-xs text-muted-foreground">Rated</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Eye className="h-4 w-4 text-secondary mr-1" />
              <span className="font-semibold text-lg">{counts.wishlist}</span>
            </div>
            <p className="text-xs text-muted-foreground">Wishlist</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-semibold text-lg">{friend.score || 0}</span>
            </div>
            <p className="text-xs text-muted-foreground">Score</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewProfile(friend)}
            className="hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onChat(friend)}
            className="hover:bg-secondary hover:text-secondary-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const FriendCard = memo(FriendCardComponent);
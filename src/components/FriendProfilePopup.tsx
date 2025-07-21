import { useState, useEffect } from 'react';
import { User, Star, MapPin, TrendingUp, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface FriendProfilePopupProps {
  friend: any;
  isOpen: boolean;
  onClose: () => void;
  onViewProfile?: (friend: any) => void;
}

export function FriendProfilePopup({ friend, isOpen, onClose, onViewProfile }: FriendProfilePopupProps) {
  const navigate = useNavigate();
  const { getFriendProfile, refreshProfile } = useFriendProfiles();
  
  // Get cached profile data instantly
  const cachedProfile = friend ? getFriendProfile(friend.id) : null;
  
  const [stats, setStats] = useState({
    ratedCount: cachedProfile?.rated_count || 0,
    wishlistCount: cachedProfile?.wishlist_count || 0,
    averageRating: cachedProfile?.avg_rating || 0,
    topCuisine: '',
    isLoading: false
  });

  useEffect(() => {
    if (isOpen && friend) {
      // If we have cached data, use it instantly
      if (cachedProfile) {
        console.log('⚡ Using cached friend profile for popup - INSTANT load!');
        setStats({
          ratedCount: cachedProfile.rated_count,
          wishlistCount: cachedProfile.wishlist_count,
          averageRating: cachedProfile.avg_rating,
          topCuisine: '',
          isLoading: false
        });
      } else {
        // Fallback: refresh profile if not in cache
        console.log('Cache miss - refreshing profile...');
        setStats(prev => ({ ...prev, isLoading: true }));
        refreshProfile(friend.id).then(() => {
          const updatedProfile = getFriendProfile(friend.id);
          if (updatedProfile) {
            setStats({
              ratedCount: updatedProfile.rated_count,
              wishlistCount: updatedProfile.wishlist_count,
              averageRating: updatedProfile.avg_rating,
              topCuisine: '',
              isLoading: false
            });
          } else {
            setStats(prev => ({ ...prev, isLoading: false }));
          }
        });
      }
    }
  }, [isOpen, friend, cachedProfile, refreshProfile, getFriendProfile]);


  const handleViewFullProfile = () => {
    onClose();
    // Use callback to parent component to handle profile viewing
    if (onViewProfile) {
      onViewProfile(friend);
    }
  };

  if (!friend) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={friend.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {friend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">@{friend.username}</DialogTitle>
              {friend.name && (
                <p className="text-muted-foreground">{friend.name}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={friend.is_public ? "default" : "secondary"} className="text-xs">
                  {friend.is_public ? 'Public' : 'Private'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Score: {friend.score}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {stats.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Star className="h-5 w-5 text-primary mr-1" />
                    </div>
                    <div className="text-2xl font-bold">{stats.ratedCount}</div>
                    <div className="text-xs text-muted-foreground">Rated</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Eye className="h-5 w-5 text-primary mr-1" />
                    </div>
                    <div className="text-2xl font-bold">{stats.wishlistCount}</div>
                    <div className="text-xs text-muted-foreground">Wishlist</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {stats.ratedCount > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{stats.averageRating.toFixed(1)}</span>
                    </div>
                  </div>
                  {stats.topCuisine && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Favorite Cuisine</span>
                      <Badge variant="outline" className="text-xs">
                        {stats.topCuisine}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={handleViewFullProfile} className="flex-1">
            <User className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
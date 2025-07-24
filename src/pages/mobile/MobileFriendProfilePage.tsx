import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  MapPin,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { FriendProfileSkeleton } from '@/components/skeletons/FriendProfileSkeleton';

export default function MobileFriendProfilePage() {
  const { friendId, userId } = useParams();
  const actualUserId = userId || friendId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFriendProfile, refreshProfile, isPreloading } = useFriendProfiles();

  const profile = actualUserId ? getFriendProfile(actualUserId) : null;
  const [friend, setFriend] = useState<any>(null);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [allWishlist, setAllWishlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'restaurants' | 'wishlist'>('restaurants');

  useEffect(() => {
    if (profile) {
      setFriend({
        id: actualUserId,
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public
      });
      setAllRestaurants(profile.recent_restaurants || []);
      setAllWishlist([]);
    }
  }, [profile, actualUserId]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white p-4 shadow flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={friend?.avatar_url} />
          <AvatarFallback>{friend?.username?.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-lg font-semibold truncate">{friend?.username}</span>
      </div>

      {/* Tabs */}
      <div className="sticky top-[64px] z-40 bg-white px-4 py-2 flex justify-around border-b">
        <Button variant={activeView === 'restaurants' ? 'default' : 'ghost'} onClick={() => setActiveView('restaurants')}>Restaurants</Button>
        <Button variant={activeView === 'wishlist' ? 'default' : 'ghost'} onClick={() => setActiveView('wishlist')}>Wishlist</Button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {(isLoading || isPreloading) ? (
          <FriendProfileSkeleton />
        ) : (
          <div className="space-y-4">
            {(activeView === 'restaurants' ? allRestaurants : allWishlist).map((r) => (
              <div key={r.id} className="p-4 bg-white rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-md font-semibold">{r.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="w-4 h-4" />{r.location}</div>
                  </div>
                  {activeView === 'restaurants' && (
                    <Badge variant="secondary">{r.rating}/10</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                  {r.tags?.map((tag: string) => <Badge key={tag}>{tag}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
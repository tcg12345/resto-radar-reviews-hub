import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Heart,
  Search,
  SlidersHorizontal,
  Grid3X3,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MobileFriendProfilePage() {
  const { friendId, userId } = useParams();
  const actualUserId = userId || friendId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getFriendProfile, refreshProfile, isPreloading } = useFriendProfiles();
  const { toast } = useToast();
  
  const profile = actualUserId ? getFriendProfile(actualUserId) : null;
  const [friend, setFriend] = useState<any>(null);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [allWishlist, setAllWishlist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<'restaurants' | 'wishlist'>('restaurants');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    if (!actualUserId || !user) return;

    if (profile && profile.username) {
      setFriend({
        id: actualUserId,
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public,
        score: profile.rated_count
      });
      
      setStats({
        averageRating: profile.avg_rating,
        totalRated: profile.rated_count,
        totalWishlist: profile.wishlist_count
      });
      
      setIsLoading(false);
      loadFullRestaurantData();
    } else if (!isPreloading) {
      setIsLoading(true);
      refreshProfile(actualUserId).then(() => {
        const refreshedProfile = getFriendProfile(actualUserId);
        if (!refreshedProfile) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view this profile.",
            variant: "destructive",
          });
          navigate('/friends');
        }
      }).catch(() => {
        setIsLoading(false);
        navigate('/friends');
      });
    }
  }, [actualUserId, user, profile, refreshProfile, getFriendProfile, navigate, toast, isPreloading]);

  const loadFullRestaurantData = async () => {
    if (!actualUserId || !user) return;
    
    console.log('🔍 Loading restaurant data for user:', actualUserId);
    
    try {
      // Get ALL restaurants for this user (both rated and wishlist)
      const { data: allRestaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', actualUserId)
        .order('created_at', { ascending: false });

      console.log('🍽️ All restaurants from direct query:', allRestaurantsData);
      console.log('❌ Restaurants error:', restaurantsError);

      if (restaurantsError) {
        console.error('Error loading restaurants:', restaurantsError);
        return;
      }

      if (allRestaurantsData) {
        const ratedRestaurants = allRestaurantsData.filter(r => r.is_wishlist === false);
        const wishlistRestaurants = allRestaurantsData.filter(r => r.is_wishlist === true);
        
        console.log('⭐ Rated restaurants:', ratedRestaurants.length, ratedRestaurants);
        console.log('❤️ Wishlist restaurants:', wishlistRestaurants.length, wishlistRestaurants);
        
        setAllRestaurants(ratedRestaurants);
        setAllWishlist(wishlistRestaurants);
        
        const topCuisines = calculateTopCuisines(ratedRestaurants);
        setStats(prev => ({ 
          ...prev, 
          topCuisines,
          totalRated: ratedRestaurants.length,
          totalWishlist: wishlistRestaurants.length
        }));
      } else {
        console.log('📭 No restaurant data found');
      }
    } catch (error) {
      console.error('💥 Error loading restaurant data:', error);
    }
  };

  const calculateTopCuisines = (restaurantData: any[]) => {
    const cuisineCount: { [key: string]: number } = {};
    restaurantData.forEach(r => {
      if (r.cuisine) {
        cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
      }
    });
    
    return Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 2);
  };

  const getFilteredData = (data: any[]) => {
    let filtered = data.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  };

  const currentData = activeView === 'restaurants' ? allRestaurants : allWishlist;
  const filteredData = getFilteredData(currentData);

  const addToWishlist = async (restaurant: any) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('restaurants').insert({
        user_id: user.id,
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        cuisine: restaurant.cuisine,
        is_wishlist: true
      });

      if (!error) {
        toast({ title: "Added to wishlist!" });
      }
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const RestaurantItem = ({ restaurant }: { restaurant: any }) => {
    if (viewMode === 'grid') {
      return (
        <div className="bg-card rounded-lg border p-2">
          <div className="aspect-square bg-muted rounded mb-2"></div>
          <h4 className="font-medium text-xs truncate mb-1">{restaurant.name}</h4>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {restaurant.cuisine}
            </Badge>
            {restaurant.rating && (
              <div className="flex items-center gap-0.5">
                <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-medium">{restaurant.rating}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 py-2 px-1">
        <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{restaurant.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
              {restaurant.cuisine}
            </Badge>
            {restaurant.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs">{restaurant.rating}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{restaurant.city}</span>
          </div>
        </div>
        {activeView === 'restaurants' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addToWishlist(restaurant)}
            className="h-8 w-8 p-0"
          >
            <Heart className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  if (isLoading || !friend) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-3 p-3 border-b">
          <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
          <div className="w-24 h-4 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded-lg"></div>
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center gap-3 p-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/friends')} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-7 w-7">
            <AvatarImage src={friend.avatar_url || ''} />
            <AvatarFallback className="text-xs">
              {friend.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate">@{friend.username}</h1>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Compact Profile Card */}
        <div className="bg-card rounded-lg border p-3">
          {friend.name && (
            <p className="font-medium text-sm mb-2 truncate">{friend.name}</p>
          )}
          
          {/* Horizontal Stats */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 text-center py-2 bg-muted/30 rounded-md">
              <div className="text-base font-bold">{stats.totalRated || 0}</div>
              <div className="text-[10px] text-muted-foreground">Rated</div>
            </div>
            <div className="flex-1 text-center py-2 bg-muted/30 rounded-md">
              <div className="text-base font-bold">{stats.totalWishlist || 0}</div>
              <div className="text-[10px] text-muted-foreground">Wishlist</div>
            </div>
            <div className="flex-1 text-center py-2 bg-muted/30 rounded-md">
              <div className="text-base font-bold">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              <div className="text-[10px] text-muted-foreground">Avg</div>
            </div>
          </div>

          {/* Top Cuisines - Horizontal */}
          {stats.topCuisines && stats.topCuisines.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {stats.topCuisines.map((item: any, index: number) => (
                <Badge key={index} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {item.cuisine}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Toggle Buttons */}
        <div className="flex gap-2">
          <Button
            variant={activeView === 'restaurants' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('restaurants')}
            className="flex-1 h-8 text-xs"
          >
            Rated ({stats.totalRated || 0})
          </Button>
          <Button
            variant={activeView === 'wishlist' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('wishlist')}
            className="flex-1 h-8 text-xs"
          >
            Wishlist ({stats.totalWishlist || 0})
          </Button>
        </div>

        {/* Search and Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-24 h-8">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className="h-8 w-8 p-0"
          >
            {viewMode === 'list' ? <Grid3X3 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Restaurant List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-1'}>
          {filteredData.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-muted-foreground text-sm">
                No {activeView === 'restaurants' ? 'rated restaurants' : 'wishlist items'} found
              </p>
            </div>
          ) : (
            filteredData.map((restaurant, index) => (
              <RestaurantItem key={index} restaurant={restaurant} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
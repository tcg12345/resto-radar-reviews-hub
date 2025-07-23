import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  Eye, 
  MapPin, 
  Calendar, 
  TrendingUp,
  Award,
  Target,
  ChefHat,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  Heart,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { FriendProfileSkeleton } from '@/components/skeletons/FriendProfileSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function MobileFriendProfilePage() {
  const { friendId, userId } = useParams();
  const actualUserId = userId || friendId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { getFriendProfile, refreshProfile, isPreloading } = useFriendProfiles();
  const { toast } = useToast();
  
  const profile = actualUserId ? getFriendProfile(actualUserId) : null;
  const [friend, setFriend] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [allWishlist, setAllWishlist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurants');
  
  // Simplified filter states for mobile
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!actualUserId || !user) return;

    if (profile && profile.username) {
      console.log('⚡ Using cached friend profile - INSTANT load!');
      
      const foundFriend = friends.find(f => f.id === actualUserId) || {
        id: actualUserId,
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public,
        score: profile.rated_count
      };
      
      setFriend(foundFriend);
      
      setStats({
        averageRating: profile.avg_rating,
        totalRated: profile.rated_count,
        totalWishlist: profile.wishlist_count,
        recentActivity: profile.recent_restaurants || []
      });
      
      setIsLoading(false);
      loadFullRestaurantData();
    } else if (!isPreloading) {
      console.log('Cache miss - fetching profile...');
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
      }).catch((error) => {
        console.error('Error loading friend profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      });
    }
  }, [actualUserId, user, profile, friends, refreshProfile, getFriendProfile, navigate, toast, isPreloading]);

  const loadFullRestaurantData = async () => {
    if (!actualUserId || !user) return;
    
    setIsLoadingFullData(true);
    
    try {
      const { data: completeProfile, error } = await supabase
        .rpc('get_friend_profile_data', { 
          target_user_id: actualUserId,
          requesting_user_id: user.id,
          restaurant_limit: 1000
        });

      if (error) {
        console.error('❌ Error loading complete profile:', error);
        return;
      }

      if (completeProfile && completeProfile.length > 0) {
        const profileData = completeProfile[0];
        
        if (profileData.recent_restaurants && Array.isArray(profileData.recent_restaurants)) {
          const restaurantData = profileData.recent_restaurants as any[];
          
          const ratedRestaurants = restaurantData.filter((r: any) => r.is_wishlist !== true);
          setAllRestaurants(ratedRestaurants);

          setStats(prev => ({
            ...prev,
            topCuisines: calculateTopCuisines(ratedRestaurants),
            ratingDistribution: calculateRatingDistribution(ratedRestaurants),
            michelinCount: ratedRestaurants.filter((r: any) => r.michelin_stars > 0).length
          }));
          
          const wishlistData = restaurantData.filter((r: any) => r.is_wishlist === true);
          setAllWishlist(wishlistData);
        }
      }
    } catch (error) {
      console.error('💥 Error in loadFullRestaurantData:', error);
    } finally {
      setIsLoadingFullData(false);
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
      .slice(0, 3);
  };

  const calculateRatingDistribution = (ratedRestaurants: any[]) => {
    const ratingDistribution: { [key: string]: number } = {
      'High (8-10)': 0,
      'Good (6-8)': 0,
      'Average (4-6)': 0,
      'Low (0-4)': 0
    };
    
    const ratedWithScores = ratedRestaurants.filter(r => r.rating);
    ratedWithScores.forEach(r => {
      const rating = r.rating;
      if (rating >= 8) ratingDistribution['High (8-10)']++;
      else if (rating >= 6) ratingDistribution['Good (6-8)']++;
      else if (rating >= 4) ratingDistribution['Average (4-6)']++;
      else ratingDistribution['Low (0-4)']++;
    });
    
    return ratingDistribution;
  };

  // Filter and sort data
  const getFilteredData = (data: any[]) => {
    let filtered = data.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.address && item.address.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });

    switch (sortBy) {
      case 'rating-high':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating-low':
        filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  };

  const filteredRestaurants = getFilteredData(allRestaurants);
  const filteredWishlist = getFilteredData(allWishlist);

  const addToWishlist = async (restaurant: any) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to add restaurants to your wishlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      let formattedLocation = restaurant.city;
      if (restaurant.country) {
        if (restaurant.country.toLowerCase() === 'united states' || restaurant.country.toLowerCase() === 'usa') {
          const addressParts = restaurant.address.split(',');
          const state = addressParts[addressParts.length - 1]?.trim();
          if (state && state.length <= 3) {
            formattedLocation = `${restaurant.city}, ${state}`;
          } else {
            formattedLocation = `${restaurant.city}, ${restaurant.country}`;
          }
        } else {
          formattedLocation = `${restaurant.city}, ${restaurant.country}`;
        }
      }

      const { error } = await supabase
        .from('restaurants')
        .insert({
          user_id: user.id,
          name: restaurant.name,
          address: restaurant.address,
          city: formattedLocation,
          country: restaurant.country,
          cuisine: restaurant.cuisine,
          price_range: restaurant.price_range,
          michelin_stars: restaurant.michelin_stars,
          notes: restaurant.notes,
          photos: restaurant.photos,
          website: restaurant.website,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          reservable: restaurant.reservable,
          reservation_url: restaurant.reservation_url,
          opening_hours: restaurant.opening_hours,
          is_wishlist: true
        });

      if (error) {
        console.error('Error adding to wishlist:', error);
        toast({
          title: "Error",
          description: "Failed to add restaurant to wishlist. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Added to wishlist!",
          description: `${restaurant.name} has been added to your wishlist.`
        });
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast({
        title: "Error",
        description: "Failed to add restaurant to wishlist. Please try again.",
        variant: "destructive",
      });
    }
  };

  const RestaurantCard = ({ restaurant, showAddButton = false }: { restaurant: any; showAddButton?: boolean }) => (
    <Card className="mb-3">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{restaurant.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs px-1 py-0">{restaurant.cuisine}</Badge>
              {restaurant.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-medium">{restaurant.rating}</span>
                </div>
              )}
            </div>
          </div>
          {showAddButton && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs ml-2"
              onClick={() => addToWishlist(restaurant)}
            >
              <Heart className="h-3 w-3 mr-1" />
              Add
            </Button>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{restaurant.city}</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} size="sm" />}
            {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} size="sm" />}
          </div>
        </div>
        
        {restaurant.date_visited && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Visited {new Date(restaurant.date_visited).toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading || !friend) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-50 bg-background border-b">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-8 h-8 bg-muted animate-pulse rounded-full"></div>
            <div className="w-32 h-6 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
        <FriendProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={friend.avatar_url || ''} />
            <AvatarFallback className="text-sm">
              {friend.username?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-lg truncate">@{friend.username}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refreshProfile(actualUserId!)}>
            <RefreshCw className={`h-4 w-4 ${isLoadingFullData ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={friend.avatar_url || ''} />
                <AvatarFallback className="text-2xl">
                  {friend.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                {friend.name && (
                  <p className="font-medium text-base mb-1 truncate">{friend.name}</p>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={friend.is_public ? "default" : "secondary"} className="text-xs">
                    {friend.is_public ? 'Public' : 'Private'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Score: {friend.score}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{stats.totalRated || 0}</div>
                <div className="text-xs text-muted-foreground">Rated</div>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">{stats.totalWishlist || 0}</div>
                <div className="text-xs text-muted-foreground">Wishlist</div>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>

            {/* Top Cuisines */}
            {stats.topCuisines && stats.topCuisines.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Favorite Cuisines</h4>
                <div className="flex flex-wrap gap-1">
                  {stats.topCuisines.map((item: any, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {item.cuisine} ({item.count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-9 px-3"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="rating-high">Highest Rated</SelectItem>
                      <SelectItem value="rating-low">Lowest Rated</SelectItem>
                      <SelectItem value="name">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mobile-Optimized Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="restaurants" className="text-xs">
              Restaurants ({filteredRestaurants.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="text-xs">
              Wishlist ({filteredWishlist.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurants" className="mt-4">
            {isLoadingFullData ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No restaurants found matching your search.' : 'No restaurants rated yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-0">
                {filteredRestaurants.map((restaurant: any) => (
                  <RestaurantCard 
                    key={restaurant.id} 
                    restaurant={restaurant} 
                    showAddButton={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wishlist" className="mt-4">
            {isLoadingFullData ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredWishlist.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No wishlist items found matching your search.' : 'No wishlist items yet.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-0">
                {filteredWishlist.map((restaurant: any) => (
                  <RestaurantCard 
                    key={restaurant.id} 
                    restaurant={restaurant} 
                    showAddButton={false}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
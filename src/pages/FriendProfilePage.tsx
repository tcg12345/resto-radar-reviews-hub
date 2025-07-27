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
  Users,
  Clock,
  Globe,
  DollarSign,
  Flame,
  PieChart,
  Activity,
  Utensils,
  Map as MapIcon
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
import { Progress } from '@/components/ui/progress';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { useFriendProfiles } from '@/contexts/FriendProfilesContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function FriendProfilePage() {
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
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    if (!actualUserId || !user) return;

    if (profile && profile.username) {
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
        console.error('Error loading complete profile:', error);
        return;
      }

      if (completeProfile && completeProfile.length > 0) {
        const profileData = completeProfile[0];
        
        if (profileData.recent_restaurants && Array.isArray(profileData.recent_restaurants)) {
          const restaurantData = profileData.recent_restaurants as any[];
          
          const ratedRestaurants = restaurantData.filter((r: any) => r.is_wishlist !== true);
          setRestaurants(ratedRestaurants);
          setAllRestaurants(ratedRestaurants);

          setStats(prev => ({
            ...prev,
            topCuisines: calculateTopCuisines(ratedRestaurants),
            ratingDistribution: calculateRatingDistribution(ratedRestaurants),
            michelinCount: ratedRestaurants.filter((r: any) => r.michelin_stars > 0).length
          }));
          
          const wishlistData = restaurantData.filter((r: any) => r.is_wishlist === true);
          setWishlist(wishlistData);
          setAllWishlist(wishlistData);
        }
      }
    } catch (error) {
      console.error('Error in loadFullRestaurantData:', error);
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
      .slice(0, 10);
  };

  const calculateRatingDistribution = (ratedRestaurants: any[]) => {
    const ratingDistribution: { [key: string]: number } = {
      '0-2': 0,
      '2-4': 0,
      '4-6': 0,
      '6-8': 0,
      '8-10': 0
    };
    
    const ratedWithScores = ratedRestaurants.filter(r => r.rating);
    ratedWithScores.forEach(r => {
      const rating = r.rating;
      if (rating >= 0 && rating < 2) ratingDistribution['0-2']++;
      else if (rating >= 2 && rating < 4) ratingDistribution['2-4']++;
      else if (rating >= 4 && rating < 6) ratingDistribution['4-6']++;
      else if (rating >= 6 && rating < 8) ratingDistribution['6-8']++;
      else if (rating >= 8 && rating <= 10) ratingDistribution['8-10']++;
    });
    
    return ratingDistribution;
  };

  const filteredRestaurants = useMemo(() => {
    let filtered = allRestaurants.filter(restaurant => {
      const matchesSearch = restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          restaurant.cuisine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (restaurant.address && restaurant.address.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCuisine = cuisineFilter === 'all' || restaurant.cuisine === cuisineFilter;
      const matchesCity = cityFilter === 'all' || restaurant.city === cityFilter;
      const matchesRating = ratingFilter === 'all' || 
                           (ratingFilter === 'high' && restaurant.rating >= 8) ||
                           (ratingFilter === 'medium' && restaurant.rating >= 6 && restaurant.rating < 8) ||
                           (ratingFilter === 'low' && restaurant.rating < 6);
      
      return matchesSearch && matchesCuisine && matchesCity && matchesRating;
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
      case 'cuisine':
        filtered.sort((a, b) => a.cuisine.localeCompare(b.cuisine));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [allRestaurants, searchTerm, cuisineFilter, cityFilter, sortBy, ratingFilter]);

  const availableCuisines = useMemo(() => {
    const cuisineCount: { [key: string]: number } = {};
    allRestaurants.forEach(r => {
      if (r.cuisine) {
        cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
      }
    });
    
    return Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => a.cuisine.localeCompare(b.cuisine));
  }, [allRestaurants]);

  const availableCities = useMemo(() => {
    const cityCount: { [key: string]: number } = {};
    allRestaurants.forEach(r => {
      if (r.city) {
        cityCount[r.city] = (cityCount[r.city] || 0) + 1;
      }
    });
    
    return Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => a.city.localeCompare(b.city));
  }, [allRestaurants]);

  const handleRefresh = async () => {
    if (!actualUserId) return;
    setIsLoadingFullData(true);
    await refreshProfile(actualUserId);
    await loadFullRestaurantData();
  };

  if (isLoading || !friend) {
    return <FriendProfileSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/friends')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={friend.avatar_url} alt={friend.name || friend.username} />
                  <AvatarFallback>
                    {(friend.name || friend.username)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold">{friend.name || friend.username}</h1>
                  <p className="text-sm text-muted-foreground">@{friend.username}</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoadingFullData}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFullData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Dense content layout */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Quick Stats Overview - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-md">
                <Star className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold">{stats.totalRated || 0}</div>
                <div className="text-xs text-muted-foreground">Rated</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-500/10 rounded-md">
                <Heart className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <div className="text-lg font-bold">{stats.totalWishlist || 0}</div>
                <div className="text-xs text-muted-foreground">Wishlist</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/10 rounded-md">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <div className="text-lg font-bold">{stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}</div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 rounded-md">
                <Award className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <div className="text-lg font-bold">{stats.michelinCount || 0}</div>
                <div className="text-xs text-muted-foreground">Michelin</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/10 rounded-md">
                <ChefHat className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <div className="text-lg font-bold">{stats.topCuisines?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Cuisines</div>
              </div>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-500/10 rounded-md">
                <MapIcon className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <div className="text-lg font-bold">{availableCities.length || 0}</div>
                <div className="text-xs text-muted-foreground">Cities</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Comprehensive Tab System */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Restaurants ({filteredRestaurants.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist ({allWishlist.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab - Rich Dashboard */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Rating Distribution */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Rating Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.ratingDistribution && Object.entries(stats.ratingDistribution).map(([range, count]) => (
                    <div key={range} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{range}</span>
                      <div className="flex items-center gap-2 flex-1 ml-3">
                        <Progress 
                          value={((count as number) / (stats.totalRated || 1)) * 100} 
                          className="h-2 flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-8">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Cuisines */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Top Cuisines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.topCuisines?.slice(0, 8).map((item: any, index: number) => (
                    <div key={item.cuisine} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground w-4">#{index + 1}</div>
                        <span className="text-sm font-medium truncate">{item.cuisine}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Cities */}
              <Card className="lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Top Cities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableCities.slice(0, 8).map((item, index) => (
                    <div key={item.city} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-muted-foreground w-4">#{index + 1}</div>
                        <span className="text-sm font-medium truncate">{item.city}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">{item.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(stats.recentActivity || []).slice(0, 6).map((restaurant: any) => (
                    <Card key={restaurant.id} className="p-3 hover:shadow-md transition-shadow">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-sm truncate">{restaurant.name}</h4>
                          {restaurant.rating && (
                            <Badge variant="secondary" className="text-xs">
                              ⭐ {restaurant.rating}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1">
                            <ChefHat className="h-3 w-3" />
                            {restaurant.cuisine}
                          </div>
                          {restaurant.date_visited && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(restaurant.date_visited).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-4">
            {/* Dense Filter Controls */}
            <Card className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9"
                />
                
                <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    {availableCuisines.map(({ cuisine, count }) => (
                      <SelectItem key={cuisine} value={cuisine}>{cuisine} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {availableCities.map(({ city, count }) => (
                      <SelectItem key={city} value={city}>{city} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="high">8.0+ ⭐</SelectItem>
                    <SelectItem value="medium">6.0-7.9 ⭐</SelectItem>
                    <SelectItem value="low">Below 6.0 ⭐</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="rating-high">Rating ↓</SelectItem>
                    <SelectItem value="rating-low">Rating ↑</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Compact Restaurant Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredRestaurants.map((restaurant) => (
                <Card key={restaurant.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm truncate">{restaurant.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{restaurant.cuisine}</Badge>
                        {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {restaurant.city}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{restaurant.rating?.toFixed(1) || '—'}</div>
                      <div className="text-xs text-muted-foreground">rating</div>
                    </div>
                  </div>
                  {restaurant.notes && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-xs truncate">
                      {restaurant.notes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {allWishlist.map((restaurant) => (
                <Card key={restaurant.id} className="p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-sm truncate">{restaurant.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{restaurant.cuisine}</Badge>
                    {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {restaurant.city}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Enhanced Analytics Cards */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Dining Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Rating</span>
                    <span className="font-bold">{stats.averageRating?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Rated</span>
                    <span className="font-bold">{stats.totalRated || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Wishlist</span>
                    <span className="font-bold">{stats.totalWishlist || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Michelin</span>
                    <span className="font-bold">{stats.michelinCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Rating Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stats.ratingDistribution && ['8-10', '6-8', '4-6', '2-4', '0-2'].map(range => {
                    const count = stats.ratingDistribution[range] || 0;
                    const percentage = stats.totalRated > 0 ? (count / stats.totalRated) * 100 : 0;
                    return (
                      <div key={range} className="flex items-center gap-2">
                        <span className="text-xs w-10">{range}</span>
                        <Progress value={percentage} className="h-2 flex-1" />
                        <span className="text-xs w-6">{count}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Geographic Spread</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{availableCities.length}</div>
                    <div className="text-xs text-muted-foreground">cities explored</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <div className="grid gap-3">
              {(stats.recentActivity || []).map((restaurant: any) => (
                <Card key={restaurant.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{restaurant.name}</h4>
                      <div className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</div>
                    </div>
                    <div className="text-right">
                      {restaurant.rating && (
                        <div className="text-lg font-bold text-primary">{restaurant.rating}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {restaurant.date_visited ? new Date(restaurant.date_visited).toLocaleDateString() : 'Added'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-4">
            <Card className="p-8 text-center">
              <MapIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Restaurant Map</h3>
              <p className="text-muted-foreground">Interactive map view coming soon</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
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
      // Load restaurants with the optimized function
      const { data: restaurantData, error: restaurantError } = await supabase
        .rpc('get_friend_profile_data', { 
          target_user_id: actualUserId,
          requesting_user_id: user.id,
          restaurant_limit: 100 // Use reasonable limit for better performance
        });

      if (restaurantError) {
        console.error('Error loading restaurants:', restaurantError);
        toast({
          title: "Error Loading Restaurants",
          description: "Failed to load restaurant data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Load wishlist separately for better performance
      const { data: wishlistData, error: wishlistError } = await supabase
        .rpc('get_friend_wishlist_data', { 
          target_user_id: actualUserId,
          requesting_user_id: user.id,
          wishlist_limit: 100 // Use reasonable limit for better performance
        });

      if (wishlistError) {
        console.error('Error loading wishlist:', wishlistError);
        toast({
          title: "Error Loading Wishlist",
          description: "Failed to load wishlist data. Please try again.",
          variant: "destructive",
        });
      }

      if (restaurantData && restaurantData.length > 0) {
        const profileData = restaurantData[0];
        
        if (profileData.recent_restaurants && Array.isArray(profileData.recent_restaurants)) {
          const restaurants = profileData.recent_restaurants as any[];
          
          const ratedRestaurants = restaurants.filter((r: any) => r.is_wishlist !== true);
          setRestaurants(ratedRestaurants);
          setAllRestaurants(ratedRestaurants);

          setStats(prev => ({
            ...prev,
            topCuisines: calculateTopCuisines(ratedRestaurants),
            ratingDistribution: calculateRatingDistribution(ratedRestaurants),
            michelinCount: ratedRestaurants.filter((r: any) => r.michelin_stars > 0).length
          }));
        }
      }

      // Handle wishlist data separately
      if (wishlistData && wishlistData.length > 0 && wishlistData[0].can_view) {
        const wishlistItems = wishlistData[0].wishlist_items as any[];
        setWishlist(wishlistItems);
        setAllWishlist(wishlistItems);
      }

    } catch (error) {
      console.error('Error in loadFullRestaurantData:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while loading data.",
        variant: "destructive",
      });
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      {/* Full-width Header */}
      <div className="border-b bg-card/95 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/friends')}
                className="h-9 w-9 p-0 hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                  <AvatarImage src={friend.avatar_url} alt={friend.name || friend.username} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-lg font-semibold">
                    {(friend.name || friend.username)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {friend.name || friend.username}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    @{friend.username}
                    {friend.is_public && (
                      <Badge variant="secondary" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isLoadingFullData}
              className="hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFullData ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Full-width content */}
      <div className="px-6 py-6 space-y-6">
        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50 hover:border-l-primary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalRated || 0}</div>
                <div className="text-sm text-muted-foreground">Rated</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500/50 hover:border-l-orange-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-lg">
                <Heart className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.totalWishlist || 0}</div>
                <div className="text-sm text-muted-foreground">Wishlist</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500/50 hover:border-l-green-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}</div>
                <div className="text-sm text-muted-foreground">Avg Rating</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500/50 hover:border-l-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-lg">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.michelinCount || 0}</div>
                <div className="text-sm text-muted-foreground">Michelin</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500/50 hover:border-l-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg">
                <ChefHat className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.topCuisines?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Cuisines</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500/50 hover:border-l-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-500/10 rounded-lg">
                <MapIcon className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{availableCities.length || 0}</div>
                <div className="text-sm text-muted-foreground">Cities</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Enhanced Tab System */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-12 bg-muted/50">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex items-center gap-2 text-sm">
              <Utensils className="h-4 w-4" />
              Restaurants ({filteredRestaurants.length})
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="flex items-center gap-2 text-sm">
              <Heart className="h-4 w-4" />
              Wishlist ({allWishlist.length})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2 text-sm">
              <MapIcon className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Rating Distribution */}
              <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Rating Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.ratingDistribution && Object.entries(stats.ratingDistribution).map(([range, count]) => (
                    <div key={range} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{range}</span>
                      <div className="flex items-center gap-3 flex-1 ml-4">
                        <Progress 
                          value={((count as number) / (stats.totalRated || 1)) * 100} 
                          className="h-3 flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-8 text-right">{count as number}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Top Cuisines */}
              <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-blue-500" />
                    Top Cuisines
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(stats.topCuisines || []).slice(0, 8).map((item: any) => (
                    <div key={item.cuisine} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.cuisine}</span>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={(item.count / (stats.totalRated || 1)) * 100} 
                          className="h-2 w-16"
                        />
                        <span className="text-sm text-muted-foreground w-6 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(stats.recentActivity || []).slice(0, 6).map((restaurant: any) => (
                      <div 
                        key={restaurant.id} 
                        className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">{restaurant.name}</h4>
                            <div className="text-xs text-muted-foreground mt-1">
                              {restaurant.cuisine} • {restaurant.city}
                            </div>
                          </div>
                          {restaurant.rating && (
                            <Badge variant="secondary" className="text-xs">
                              ⭐ {restaurant.rating}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Restaurants Tab */}
          <TabsContent value="restaurants" className="space-y-6 mt-6">
            {/* Modern Filter Controls */}
            <Card className="p-6 bg-gradient-to-r from-card to-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Search restaurants..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10"
                />
                
                <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Cuisines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cuisines</SelectItem>
                    {availableCuisines.map(({ cuisine, count }) => (
                      <SelectItem key={cuisine} value={cuisine}>{cuisine} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {availableCities.map(({ city, count }) => (
                      <SelectItem key={city} value={city}>{city} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="high">8.0+ ⭐</SelectItem>
                    <SelectItem value="medium">6.0-7.9 ⭐</SelectItem>
                    <SelectItem value="low">Below 6.0 ⭐</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="rating-high">Highest Rated</SelectItem>
                    <SelectItem value="rating-low">Lowest Rated</SelectItem>
                    <SelectItem value="name">Name A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Enhanced Restaurant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-l-4 border-l-primary/20 hover:border-l-primary hover:scale-[1.02]"
                  onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs bg-muted">
                            <ChefHat className="h-3 w-3 mr-1" />
                            {restaurant.cuisine}
                          </Badge>
                          {restaurant.michelin_stars && (
                            <MichelinStars stars={restaurant.michelin_stars} />
                          )}
                        </div>
                      </div>
                      <div className="text-center ml-4">
                        <div className="text-2xl font-bold text-primary">
                          {restaurant.rating?.toFixed(1) || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">rating</div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm truncate">{restaurant.city}</span>
                    </div>

                    {/* Visit Date */}
                    {restaurant.date_visited && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {restaurant.notes && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {restaurant.notes}
                        </p>
                      </div>
                    )}

                    {/* Category Ratings */}
                    {restaurant.category_ratings && (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Category Ratings:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(restaurant.category_ratings).slice(0, 4).map(([category, rating]) => (
                            <div key={category} className="flex justify-between text-xs">
                              <span className="capitalize">{category}:</span>
                              <span className="font-medium">{(rating as number).toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(restaurant.created_at).toLocaleDateString()}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-3 text-xs group-hover:bg-primary group-hover:text-primary-foreground"
                      >
                        View Details →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredRestaurants.length === 0 && (
              <Card className="p-12 text-center">
                <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
                <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
              </Card>
            )}
          </TabsContent>

          {/* Enhanced Wishlist Tab */}
          <TabsContent value="wishlist" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {allWishlist.map((restaurant) => (
                <Card 
                  key={restaurant.id} 
                  className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-l-4 border-l-orange-500/20 hover:border-l-orange-500 hover:scale-[1.02]"
                  onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg group-hover:text-orange-500 transition-colors truncate">
                          {restaurant.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs bg-muted">
                            <ChefHat className="h-3 w-3 mr-1" />
                            {restaurant.cuisine}
                          </Badge>
                          {restaurant.michelin_stars && (
                            <MichelinStars stars={restaurant.michelin_stars} />
                          )}
                        </div>
                      </div>
                      <Heart className="h-5 w-5 text-orange-500 fill-orange-500" />
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm truncate">{restaurant.city}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground">
                        Added {new Date(restaurant.created_at).toLocaleDateString()}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-3 text-xs group-hover:bg-orange-500 group-hover:text-white"
                      >
                        View Details →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {allWishlist.length === 0 && (
              <Card className="p-12 text-center">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No wishlist items</h3>
                <p className="text-muted-foreground">This user hasn't added any restaurants to their wishlist yet.</p>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Dining Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Rating</span>
                    <span className="font-bold text-lg">{stats.averageRating?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Rated</span>
                    <span className="font-bold text-lg">{stats.totalRated || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Wishlist Items</span>
                    <span className="font-bold text-lg">{stats.totalWishlist || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Michelin Restaurants</span>
                    <span className="font-bold text-lg">{stats.michelinCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-green-500" />
                    Rating Quality
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.ratingDistribution && ['8-10', '6-8', '4-6', '2-4', '0-2'].map(range => {
                    const count = stats.ratingDistribution[range] || 0;
                    const percentage = stats.totalRated > 0 ? (count / stats.totalRated) * 100 : 0;
                    return (
                      <div key={range} className="flex items-center gap-3">
                        <span className="text-sm w-12 font-medium">{range}</span>
                        <Progress value={percentage} className="h-3 flex-1" />
                        <span className="text-sm w-8 text-right font-bold">{count}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-red-500" />
                    Geographic Spread
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-4xl font-bold text-red-500 mb-2">{availableCities.length}</div>
                  <div className="text-sm text-muted-foreground mb-4">cities explored</div>
                  <div className="space-y-2">
                    {availableCities.slice(0, 5).map(({ city, count }) => (
                      <div key={city} className="flex justify-between text-sm">
                        <span>{city}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6 mt-6">
            <div className="grid gap-4">
              {(stats.recentActivity || []).map((restaurant: any) => (
                <Card 
                  key={restaurant.id} 
                  className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                        {restaurant.name}
                      </h4>
                      <div className="text-muted-foreground mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <ChefHat className="h-4 w-4" />
                          {restaurant.cuisine}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {restaurant.city}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {restaurant.rating && (
                        <div className="text-2xl font-bold text-primary">{restaurant.rating}</div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {restaurant.date_visited ? new Date(restaurant.date_visited).toLocaleDateString() : 'Added to list'}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {(!stats.recentActivity || stats.recentActivity.length === 0) && (
              <Card className="p-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent activity</h3>
                <p className="text-muted-foreground">This user hasn't rated any restaurants recently.</p>
              </Card>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map" className="space-y-6 mt-6">
            <Card className="p-12 text-center hover:shadow-lg transition-shadow">
              <MapIcon className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-4">Restaurant Map</h3>
              <p className="text-muted-foreground text-lg">Interactive map view coming soon</p>
              <p className="text-sm text-muted-foreground mt-2">
                Visualize all of {friend.name || friend.username}'s restaurant visits on an interactive map
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
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
  RefreshCw
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

export default function FriendProfilePage() {
  const { friendId, userId } = useParams(); // Support both /user/:userId and legacy friendId
  const actualUserId = userId || friendId; // Use userId if available, fallback to friendId
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { getFriendProfile, refreshProfile, isPreloading } = useFriendProfiles();
  const { toast } = useToast();
  
  // Get profile from cache instantly
  const profile = actualUserId ? getFriendProfile(actualUserId) : null;
  const [friend, setFriend] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [allRestaurants, setAllRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [allWishlist, setAllWishlist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFullData, setIsLoadingFullData] = useState(false);
  const [displayedRestaurants, setDisplayedRestaurants] = useState(10);
  const [displayedWishlist, setDisplayedWishlist] = useState(10);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState('all');
  
  // Wishlist filter states
  const [wishlistSearchTerm, setWishlistSearchTerm] = useState('');
  const [wishlistCuisineFilter, setWishlistCuisineFilter] = useState('all');
  const [wishlistCityFilter, setWishlistCityFilter] = useState('all');
  const [wishlistSortBy, setWishlistSortBy] = useState('newest');

  useEffect(() => {
    if (!actualUserId || !user) return;

    // If we have cached profile data, use it instantly
    if (profile && profile.username) {
      console.log('⚡ Using cached friend profile - INSTANT load!');
      
      // Set friend info from cache
      const foundFriend = friends.find(f => f.id === actualUserId) || {
        id: actualUserId,
        username: profile.username,
        name: profile.name,
        avatar_url: profile.avatar_url,
        is_public: profile.is_public,
        score: profile.rated_count
      };
      
      setFriend(foundFriend);
      
      // Set stats from cache
      setStats({
        averageRating: profile.avg_rating,
        totalRated: profile.rated_count,
        totalWishlist: profile.wishlist_count,
        recentActivity: profile.recent_restaurants || []
      });
      
      setIsLoading(false);
      
      // Load complete profile data with restaurants and wishlist
      loadFullRestaurantData();
    } else if (!isPreloading) {
      // Profile not in cache and not preloading, fetch it
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
    if (!actualUserId || !user) {
      console.log('❌ loadFullRestaurantData: Missing actualUserId or user', { actualUserId, user: !!user });
      return;
    }
    
    console.log('🚀 Starting loadFullRestaurantData for user:', actualUserId);
    setIsLoadingFullData(true);
    
    try {
      console.log('📞 Calling get_friend_profile_data RPC...');
      
      // Use the friend profile data RPC function which includes all restaurant data
      const { data: completeProfile, error } = await supabase
        .rpc('get_friend_profile_data', { 
          target_user_id: actualUserId,
          requesting_user_id: user.id,
          restaurant_limit: 1000 // Get all restaurants
        });

      console.log('📊 RPC Response:', { completeProfile, error });

      if (error) {
        console.error('❌ Error loading complete profile:', error);
        return;
      }

      if (completeProfile && completeProfile.length > 0) {
        const profileData = completeProfile[0]; // get_friend_profile_data returns an array with one row
        console.log('✅ Profile data structure:', Object.keys(profileData));
        
        // The recent_restaurants field contains all the restaurant data
        if (profileData.recent_restaurants && Array.isArray(profileData.recent_restaurants)) {
          const restaurantData = profileData.recent_restaurants as any[];
          console.log('🍽️ Loading restaurants:', restaurantData.length);
          
          // Filter out wishlist items to get only rated restaurants
          const ratedRestaurants = restaurantData.filter((r: any) => r.is_wishlist !== true);
          setRestaurants(ratedRestaurants.slice(0, 10));
          setAllRestaurants(ratedRestaurants);
          setDisplayedRestaurants(Math.min(10, ratedRestaurants.length));

          // Update stats with full data
          setStats(prev => ({
            ...prev,
            topCuisines: calculateTopCuisines(ratedRestaurants),
            ratingDistribution: calculateRatingDistribution(ratedRestaurants),
            michelinCount: ratedRestaurants.filter((r: any) => r.michelin_stars > 0).length
          }));
          
          // Set wishlist data from restaurants with is_wishlist = true
          const wishlistData = restaurantData.filter((r: any) => r.is_wishlist === true);
          console.log('⭐ Loading wishlist from restaurants:', wishlistData.length);
          setWishlist(wishlistData.slice(0, 10));
          setAllWishlist(wishlistData);
          setDisplayedWishlist(Math.min(10, wishlistData.length));
        } else {
          console.log('⚠️ No restaurants found in profile data');
        }
      }

      console.log('✅ Complete profile data loaded successfully');
    } catch (error) {
      console.error('💥 Error in loadFullRestaurantData:', error);
    } finally {
      setIsLoadingFullData(false);
    }
  };

  const handleRefresh = async () => {
    if (!actualUserId) return;
    
    setIsLoadingFullData(true);
    await refreshProfile(actualUserId);
    await loadFullRestaurantData();
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
      .slice(0, 5);
  };

  // Cache-first load more with instant response
  const loadMoreRestaurants = () => {
    if (!friend || displayedRestaurants >= allRestaurants.length) return;
    
    // Always instant from cache
    const newDisplayCount = Math.min(displayedRestaurants + 10, allRestaurants.length);
    setDisplayedRestaurants(newDisplayCount);
  };

  const loadMoreWishlist = () => {
    if (!friend || displayedWishlist >= allWishlist.length) return;
    
    // Always instant from cache
    const newDisplayCount = Math.min(displayedWishlist + 10, allWishlist.length);
    setDisplayedWishlist(newDisplayCount);
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
  
  // Filtered and sorted restaurants with memoization for performance
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

    // Sort filtered results
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
      default: // newest
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [allRestaurants, searchTerm, cuisineFilter, cityFilter, sortBy, ratingFilter]);

  // Get unique cuisines for filter dropdown with counts
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

  // Get unique cities for filter dropdown with counts
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

  // Filtered wishlist with memoization for performance
  const filteredWishlist = useMemo(() => {
    let filtered = allWishlist.filter(restaurant => {
      const matchesSearch = restaurant.name.toLowerCase().includes(wishlistSearchTerm.toLowerCase()) ||
                          restaurant.cuisine.toLowerCase().includes(wishlistSearchTerm.toLowerCase()) ||
                          (restaurant.address && restaurant.address.toLowerCase().includes(wishlistSearchTerm.toLowerCase()));
      
      const matchesCuisine = wishlistCuisineFilter === 'all' || restaurant.cuisine === wishlistCuisineFilter;
      
      const matchesCity = wishlistCityFilter === 'all' || restaurant.city === wishlistCityFilter;
      
      return matchesSearch && matchesCuisine && matchesCity;
    });

    // Sort filtered results
    switch (wishlistSortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'cuisine':
        filtered.sort((a, b) => a.cuisine.localeCompare(b.cuisine));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [allWishlist, wishlistSearchTerm, wishlistCuisineFilter, wishlistCityFilter, wishlistSortBy]);

  // Get unique cuisines for wishlist filter dropdown with counts
  const availableWishlistCuisines = useMemo(() => {
    const cuisineCount: { [key: string]: number } = {};
    allWishlist.forEach(r => {
      if (r.cuisine) {
        cuisineCount[r.cuisine] = (cuisineCount[r.cuisine] || 0) + 1;
      }
    });
    
    return Object.entries(cuisineCount)
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => a.cuisine.localeCompare(b.cuisine));
  }, [allWishlist]);

  // Get unique cities for wishlist filter dropdown with counts
  const availableWishlistCities = useMemo(() => {
    const cityCount: { [key: string]: number } = {};
    allWishlist.forEach(r => {
      if (r.city) {
        cityCount[r.city] = (cityCount[r.city] || 0) + 1;
      }
    });
    
    return Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => a.city.localeCompare(b.city));
  }, [allWishlist]);

  // Add restaurant to current user's wishlist
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
      // Format location based on country
      let formattedLocation = restaurant.city;
      if (restaurant.country) {
        if (restaurant.country.toLowerCase() === 'united states' || restaurant.country.toLowerCase() === 'usa') {
          // For USA, use city, state format (assuming address contains state info)
          const addressParts = restaurant.address.split(',');
          const state = addressParts[addressParts.length - 1]?.trim();
          if (state && state.length <= 3) { // Likely a state abbreviation
            formattedLocation = `${restaurant.city}, ${state}`;
          } else {
            formattedLocation = `${restaurant.city}, ${restaurant.country}`;
          }
        } else {
          // For international, use city, country format
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
          description: `${restaurant.name} has been added to your wishlist.`,
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

  if (isLoading || !actualUserId || !friend) {
    return (
      <FriendProfileSkeleton />
    );
  }

  return (
    <div className="min-h-screen bg-background mobile-container">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 mobile-container">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Friends
              </Button>
              {profile && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isLoadingFullData}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFullData ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0">
              <AvatarImage src={friend.avatar_url || ''} />
              <AvatarFallback className="text-3xl">
                {friend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">@{friend.username}</h1>
              {friend.name && (
                <p className="text-lg sm:text-xl text-muted-foreground mb-4 break-words">{friend.name}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant={friend.is_public ? "default" : "secondary"}>
                  {friend.is_public ? 'Public Profile' : 'Private Profile'}
                </Badge>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  Score: {friend.score}
                </Badge>
                {stats.michelinCount > 0 && (
                  <Badge variant="outline" className="text-primary">
                    <Award className="h-3 w-3 mr-1" />
                    {stats.michelinCount} Michelin
                  </Badge>
                )}
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalRated}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Restaurants Rated</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary">{stats.totalWishlist}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Wishlist Items</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-primary">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 mobile-container">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs px-2">Overview</TabsTrigger>
            <TabsTrigger value="restaurants" className="text-xs px-1">Rated</TabsTrigger>
            <TabsTrigger value="wishlist" className="text-xs px-1">Wishlist</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs px-1">Stats</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-8">
            <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-3">
              {/* Recent Activity */}
              <div className="xl:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stats.recentActivity || stats.recentActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {stats.recentActivity.map((restaurant: any) => (
                          <div key={restaurant.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium break-words">{restaurant.name}</h4>
                              <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                               <p className="text-xs text-muted-foreground">
                                 {restaurant.date_visited 
                                   ? new Date(restaurant.date_visited).toLocaleDateString()
                                   : `Added: ${new Date(restaurant.created_at).toLocaleDateString()}`
                                 }
                               </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StarRating rating={restaurant.rating} readonly size="sm" />
                              <span className="font-medium">{restaurant.rating?.toFixed(1)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stats Sidebar */}
              <div className="space-y-6">
                {/* Top Cuisines */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ChefHat className="h-5 w-5" />
                      Favorite Cuisines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!stats.topCuisines || stats.topCuisines.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No cuisine data</p>
                    ) : (
                      <div className="space-y-3">
                        {stats.topCuisines.map(({ cuisine, count }: any, index: number) => (
                          <div key={cuisine} className="flex items-center justify-between">
                            <span className="text-sm font-medium">#{index + 1} {cuisine}</span>
                            <Badge variant="outline" className="text-xs">
                              {count} restaurant{count !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rating Distribution */}
                {stats.totalRated > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5" />
                        Rating Pattern
                      </CardTitle>
                    </CardHeader>
                     <CardContent>
                       <div className="space-y-2">
                        {['8-10', '6-8', '4-6', '2-4', '0-2'].map(range => {
                          const count = (stats.ratingDistribution && stats.ratingDistribution[range]) || 0;
                          const percentage = stats.totalRated > 0 ? (count / stats.totalRated) * 100 : 0;
                           return (
                             <div key={range} className="flex items-center gap-2">
                               <span className="text-sm w-12">{range}⭐</span>
                               <div className="flex-1 bg-muted rounded-full h-2">
                                 <div 
                                   className="bg-primary rounded-full h-2 transition-all duration-300"
                                   style={{ width: `${percentage}%` }}
                                 />
                               </div>
                               <span className="text-xs text-muted-foreground w-8">{count}</span>
                             </div>
                           );
                         })}
                       </div>
                     </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Restaurants Tab */}
          <TabsContent value="restaurants" className="mt-8">
            {/* Filter and Sort Controls */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search restaurants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cuisine</label>
                    <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All cuisines" />
                      </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cuisines</SelectItem>
                          {availableCuisines.map(({ cuisine, count }) => (
                            <SelectItem key={cuisine} value={cuisine}>{cuisine} ({count})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">City</label>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All cities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {availableCities.map(({ city, count }) => (
                            <SelectItem key={city} value={city}>{city} ({count})</SelectItem>
                          ))}
                        </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All ratings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="high">8.0+ ⭐</SelectItem>
                        <SelectItem value="medium">6.0-7.9 ⭐</SelectItem>
                        <SelectItem value="low">Below 6.0 ⭐</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="rating-high">Rating (High to Low)</SelectItem>
                        <SelectItem value="rating-low">Rating (Low to High)</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="cuisine">Cuisine (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredRestaurants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">No rated restaurants found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters to see more results
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRestaurants.slice(0, displayedRestaurants).map((restaurant) => (
                   <Card key={restaurant.id} className="overflow-hidden">
                     <CardContent className="p-6">
                       <div className="grid lg:grid-cols-4 gap-6">
                         {/* Left: Restaurant Info */}
                         <div className="lg:col-span-2 space-y-3">
                           <div>
                             <h3 className="font-bold text-xl mb-1 leading-tight">{restaurant.name}</h3>
                             <div className="flex items-center gap-3">
                               <Badge variant="secondary" className="text-sm">{restaurant.cuisine}</Badge>
                               {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                               {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                             </div>
                           </div>
                           
                           <div className="flex items-center gap-2 text-sm text-muted-foreground">
                             <MapPin className="h-4 w-4 flex-shrink-0" />
                             <span className="break-words">{restaurant.address}, {restaurant.city}</span>
                           </div>
                           
                           {restaurant.date_visited && (
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                               <Calendar className="h-4 w-4 flex-shrink-0" />
                               <span>Visited: {new Date(restaurant.date_visited).toLocaleDateString()}</span>
                             </div>
                           )}
                         </div>

                          {/* Right: Rating and Actions */}
                          <div className="lg:col-span-2 flex flex-col lg:flex-row gap-4">
                            {/* Rating */}
                            {restaurant.rating && (
                              <div className="flex-1 flex flex-col items-center lg:items-end justify-center bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4">
                                <div className="text-center lg:text-right">
                                  <div className="text-3xl font-bold text-primary mb-2">{restaurant.rating.toFixed(1)}</div>
                                  <div className="flex items-center justify-center lg:justify-end mb-1">
                                    {[...Array(10)].map((_, index) => {
                                      const starValue = index + 1;
                                      const isFilled = starValue <= restaurant.rating;
                                      return (
                                        <Star
                                          key={index}
                                          className={`h-3 w-3 ${
                                            isFilled
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'fill-gray-200 text-gray-200'
                                          }`}
                                        />
                                      );
                                    })}
                                  </div>
                                  <div className="text-xs text-muted-foreground">out of 10</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Add to Wishlist Button */}
                            <div className="flex items-center justify-center lg:justify-end">
                              <Button
                                variant="outline"
                                size="lg"
                                onClick={() => addToWishlist(restaurant)}
                                className="flex items-center gap-2 h-16 px-6"
                              >
                                <Heart className="h-5 w-5" />
                                <span className="hidden sm:inline">Add to Wishlist</span>
                              </Button>
                            </div>
                          </div>
                       </div>

                       {restaurant.notes && (
                         <div className="mt-6 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                           <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                           <p className="text-sm leading-relaxed">{restaurant.notes}</p>
                         </div>
                       )}
                    </CardContent>
                  </Card>
                ))}
                {displayedRestaurants < filteredRestaurants.length && (
                  <div className="text-center mt-6">
                    <Button 
                      variant="outline" 
                      onClick={loadMoreRestaurants}
                      className="flex items-center gap-2"
                    >
                      Load More ({filteredRestaurants.length - displayedRestaurants} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-8">
            {/* Wishlist Filter Controls */}
            <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search</label>
                      <Input
                        placeholder="Search wishlist..."
                        value={wishlistSearchTerm}
                        onChange={(e) => setWishlistSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Cuisine</label>
                      <Select value={wishlistCuisineFilter} onValueChange={setWishlistCuisineFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All cuisines" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cuisines</SelectItem>
                          {availableWishlistCuisines.map(({ cuisine, count }) => (
                            <SelectItem key={cuisine} value={cuisine}>{cuisine} ({count})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <Select value={wishlistSortBy} onValueChange={setWishlistSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Newest First</SelectItem>
                          <SelectItem value="oldest">Oldest First</SelectItem>
                          <SelectItem value="name">Name (A-Z)</SelectItem>
                          <SelectItem value="cuisine">Cuisine (A-Z)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                 </CardContent>
               </Card>

            {/* City Filter Buttons */}
            {availableWishlistCities.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={wishlistCityFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWishlistCityFilter('all')}
                  >
                    All Cities
                  </Button>
                  {availableWishlistCities.map(({ city, count }) => (
                    <Button
                      key={city}
                      variant={wishlistCityFilter === city ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setWishlistCityFilter(city)}
                    >
                      {city} ({count})
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {filteredWishlist.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    {allWishlist.length === 0 ? "No wishlist items yet" : "No wishlist items found"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {allWishlist.length === 0 
                      ? `${friend.username} hasn't added any restaurants to their wishlist`
                      : "Try adjusting your filters to see more results"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredWishlist.slice(0, displayedWishlist).map((restaurant) => (
                   <Card key={restaurant.id} className="overflow-hidden">
                     <CardContent className="p-4 sm:p-6">
                       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                         <div className="flex-1 min-w-0">
                           <h3 className="font-bold text-lg sm:text-xl mb-1 break-words">{restaurant.name}</h3>
                           <p className="text-muted-foreground mb-2">{restaurant.cuisine}</p>
                           <div className="flex items-center gap-2 text-sm text-muted-foreground">
                             <MapPin className="h-4 w-4 flex-shrink-0" />
                             <span className="break-words">{restaurant.address}, {restaurant.city}</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2 flex-shrink-0">
                           {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                           {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                         </div>
                       </div>
                      {restaurant.notes && (
                        <div className="mt-4 p-4 bg-muted rounded-lg">
                          <p className="text-sm leading-relaxed">{restaurant.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {displayedWishlist < filteredWishlist.length && (
                  <div className="text-center mt-6">
                    <Button 
                      variant="outline" 
                      onClick={loadMoreWishlist}
                      className="flex items-center gap-2"
                    >
                      Load More ({filteredWishlist.length - displayedWishlist} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Rating Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Average Rating</span>
                      <span className="font-bold">{stats.averageRating > 0 ? stats.averageRating.toFixed(2) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Rated</span>
                      <span className="font-bold">{stats.totalRated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wishlist Items</span>
                      <span className="font-bold">{stats.totalWishlist}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Michelin Restaurants</span>
                      <span className="font-bold">{stats.michelinCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5" />
                    Cuisine Diversity
                  </CardTitle>
                </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                     {stats.topCuisines && stats.topCuisines.slice(0, 5).map(({ cuisine, count }: any, index: number) => (
                      <div key={cuisine} className="flex justify-between items-center">
                        <span className="text-sm">{cuisine}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${(count / stats.totalRated) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-6">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Rating Distribution
                  </CardTitle>
                </CardHeader>
                 <CardContent>
                   <div className="space-y-3">
                      {['8-10', '6-8', '4-6', '2-4', '0-2'].map(range => {
                        const count = (stats.ratingDistribution && stats.ratingDistribution[range]) || 0;
                        const percentage = stats.totalRated > 0 ? (count / stats.totalRated) * 100 : 0;
                       return (
                         <div key={range} className="flex items-center gap-3">
                           <span className="text-sm w-12">{range}⭐</span>
                           <div className="flex-1 bg-muted rounded-full h-2">
                             <div 
                               className="bg-primary rounded-full h-2"
                               style={{ width: `${percentage}%` }}
                             />
                           </div>
                           <span className="text-xs text-muted-foreground w-8">{count}</span>
                         </div>
                       );
                     })}
                   </div>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
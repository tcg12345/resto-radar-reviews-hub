import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Star, 
  Heart,
  RefreshCw,
  Globe,
  ChefHat,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Utensils,
  Map as MapIcon,
  Route
} from 'lucide-react';
import { FriendProfileSkeleton } from '@/components/skeletons/FriendProfileSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { useFriendProfilePagination } from '@/hooks/useFriendProfilePagination';
import { useFriends } from '@/hooks/useFriends';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { FriendItinerariesTab } from '@/components/FriendItinerariesTab';

export default function FriendProfilePage() {
  const { friendId, userId } = useParams();
  const actualUserId = userId || friendId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { friends } = useFriends();
  const { toast } = useToast();
  
  // Use paginated hook for fast initial load and incremental fetch
  const {
    profileData,
    restaurants: allRestaurants,
    wishlist: allWishlist,
    isLoading,
    isLoadingMore,
    hasMoreRestaurants,
    hasMoreWishlist,
    error,
    loadMoreRestaurants,
    loadMoreWishlist,
    refresh
  } = useFriendProfilePagination(actualUserId || '');
  
  const [friend, setFriend] = useState<any>(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    if (error) {
      toast({
        title: "Error Loading Profile",
        description: error,
        variant: "destructive",
      });
      navigate('/friends');
    }
  }, [error, toast, navigate]);

  useEffect(() => {
    if (profileData && actualUserId) {
      const foundFriend = friends.find(f => f.id === actualUserId) || {
        id: actualUserId,
        username: profileData.username,
        name: profileData.name,
        avatar_url: profileData.avatar_url,
        is_public: profileData.is_public,
        score: profileData.rated_count
      };
      
      setFriend(foundFriend);
    }
  }, [actualUserId, profileData, friends]);

  // Compute lightweight analytics from currently loaded items for instant UX
  const cuisineCountMap = useMemo(() => {
    const map = new Map<string, number>();
    (allRestaurants || []).forEach((r: any) => {
      const c = r.cuisine?.trim();
      if (c) map.set(c, (map.get(c) || 0) + 1);
    });
    return map;
  }, [allRestaurants]);

  const topCuisines = useMemo(() => {
    return Array.from(cuisineCountMap.entries())
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [cuisineCountMap]);

  const uniqueCuisineCount = cuisineCountMap.size;

  const ratingDistribution = useMemo(() => {
    const buckets: Record<string, number> = { '0-2': 0, '2-4': 0, '4-6': 0, '6-8': 0, '8-10': 0 };
    (allRestaurants || []).forEach((r: any) => {
      const rating = Number(r.rating) || 0;
      if (rating < 2) buckets['0-2']++;
      else if (rating < 4) buckets['2-4']++;
      else if (rating < 6) buckets['4-6']++;
      else if (rating < 8) buckets['6-8']++;
      else buckets['8-10']++;
    });
    return buckets;
  }, [allRestaurants]);

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
    const map = new Map<string, number>();
    (allRestaurants || []).forEach((r: any) => {
      const c = r.cuisine?.trim();
      if (c) map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => a.cuisine.localeCompare(b.cuisine));
  }, [allRestaurants]);

  const availableCities = useMemo(() => {
    const map = new Map<string, number>();
    (allRestaurants || []).forEach((r: any) => {
      const city = r.city?.trim();
      if (city) map.set(city, (map.get(city) || 0) + 1);
    });
    return Array.from(map.entries()).map(([city, count]) => ({ city, count }));
  }, [allRestaurants]);

  if (isLoading || !friend || !profileData) {
    return <FriendProfileSkeleton />
  }

  return (
    <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden h-[35px]" style={{ backgroundColor: 'rgb(24,24,26)' }}></div>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
        {/* Mobile Header - Simplified */}
        <div className="lg:hidden border-b bg-card/95 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/mobile/friends')}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src={friend.avatar_url} alt={friend.name || friend.username} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-semibold">
                  {(friend.name || friend.username)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold truncate">
                  {friend.name || friend.username}
                </h1>
                <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
              </div>
              <Button onClick={refresh} variant="ghost" size="sm" className="h-8 w-8 p-0">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Header - Keep original */}
        <div className="hidden lg:block border-b bg-card/95 backdrop-blur-lg sticky top-0 z-50 shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/mobile/friends')}
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
                onClick={refresh} 
                variant="outline" 
                size="sm"
                className="hover:bg-primary hover:text-primary-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6">
          {/* Mobile Stats Overview - Simplified */}
          <div className="lg:hidden grid grid-cols-2 gap-3">
            <Card className="p-3 border-l-4 border-l-primary/50">
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{profileData.rated_count || 0}</div>
                <div className="text-xs text-muted-foreground">Restaurants</div>
              </div>
            </Card>
            <Card className="p-3 border-l-4 border-l-orange-500/50">
              <div className="text-center">
                <div className="text-xl font-bold text-orange-500">{profileData.wishlist_count || 0}</div>
                <div className="text-xs text-muted-foreground">Wishlist</div>
              </div>
            </Card>
            <Card className="p-3 border-l-4 border-l-green-500/50">
              <div className="text-center">
                <div className="text-xl font-bold text-green-500">{profileData.avg_rating ? profileData.avg_rating.toFixed(1) : '0.0'}</div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </Card>
            <Card className="p-3 border-l-4 border-l-purple-500/50">
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">{availableCities.length || 0}</div>
                <div className="text-xs text-muted-foreground">Cities</div>
              </div>
            </Card>
          </div>

          {/* Desktop Stats Overview - Keep original */}
          <div className="hidden lg:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profileData.rated_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Rated</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500/20 to-orange-500/10 rounded-lg">
                  <Heart className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profileData.wishlist_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Wishlist</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profileData.avg_rating ? profileData.avg_rating.toFixed(1) : '0.0'}</div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-purple-500/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-lg">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{profileData.michelin_count || 0}</div>
                  <div className="text-sm text-muted-foreground">Michelin</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg">
                  <ChefHat className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{topCuisines?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Cuisines</div>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500/50">
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

          {/* Mobile Tabs - Simplified */}
          <div className="lg:hidden">
            <Tabs defaultValue="restaurants" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-11 bg-muted/50 rounded-xl">
                <TabsTrigger value="restaurants" className="text-xs rounded-lg">
                  <Utensils className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Restaurants</span>
                  <span className="sm:hidden">({filteredRestaurants.length})</span>
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="text-xs rounded-lg">
                  <Heart className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Wishlist</span>
                  <span className="sm:hidden">({allWishlist.length})</span>
                </TabsTrigger>
                <TabsTrigger value="itineraries" className="text-xs rounded-lg">
                  <Route className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Trips</span>
                  <span className="sm:hidden">🗺️</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-xs rounded-lg">
                  <PieChart className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Analytics</span>
                  <span className="sm:hidden">📊</span>
                </TabsTrigger>
              </TabsList>

              {/* Mobile Restaurants Tab */}
              <TabsContent value="restaurants" className="space-y-4 mt-4">
                {/* Mobile Filter Controls - Simplified */}
                <div className="space-y-3">
                  <Input
                    placeholder="Search restaurants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-9"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Cuisine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cuisines</SelectItem>
                        {availableCuisines.filter(({ cuisine }) => cuisine && cuisine.trim() !== '').map(({ cuisine, count }) => (
                          <SelectItem key={cuisine} value={cuisine}>{cuisine} ({count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="oldest">Oldest</SelectItem>
                        <SelectItem value="rating-high">⭐ High</SelectItem>
                        <SelectItem value="rating-low">⭐ Low</SelectItem>
                        <SelectItem value="name">A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mobile Restaurant Grid */}
                <div className="space-y-3">
                  {filteredRestaurants.map((restaurant) => (
                     <Card 
                       key={restaurant.id} 
                       className="overflow-hidden active:scale-95 transition-all duration-150 cursor-pointer bg-gradient-to-br from-card via-card to-muted/20 border-0 ring-1 ring-border/50"
                       onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                     >
                       {/* Header with Rating Badge - Same as desktop */}
                       <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-4 pb-3">
                         <div className="absolute top-3 right-3">
                           <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-2 py-1 rounded-lg shadow-lg">
                             <div className="text-sm font-bold text-center">
                               {restaurant.rating?.toFixed(1) || '—'}
                             </div>
                             <div className="text-xs opacity-90 text-center">rating</div>
                           </div>
                         </div>
                         
                         <div className="pr-16">
                           <h3 className="font-semibold text-base truncate mb-2">{restaurant.name}</h3>
                           <div className="flex items-center gap-2 flex-wrap">
                             <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                               <ChefHat className="h-3 w-3 mr-1" />
                               {restaurant.cuisine}
                             </Badge>
                             {restaurant.michelin_stars && (
                               <MichelinStars stars={restaurant.michelin_stars} />
                             )}
                             {restaurant.price_range && (
                               <PriceRange priceRange={restaurant.price_range} readonly size="sm" />
                             )}
                           </div>
                         </div>
                       </div>

                       {/* Content Section */}
                       <div className="p-4 pt-3 space-y-2">
                         <div className="flex items-center gap-2 text-muted-foreground">
                           <div className="p-1 bg-muted/50 rounded-lg">
                             <MapPin className="h-3 w-3" />
                           </div>
                           <span className="text-sm font-medium truncate">{restaurant.city}</span>
                         </div>
                       </div>
                    </Card>
                  ))}
                </div>

                {filteredRestaurants.length === 0 && (
                  <Card className="p-8 text-center">
                    <Utensils className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">No restaurants found</h3>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                  </Card>
                )}
              </TabsContent>

              {/* Mobile Wishlist Tab */}
              <TabsContent value="wishlist" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {allWishlist.map((restaurant) => (
                    <Card 
                      key={restaurant.id} 
                      className="p-4 active:scale-95 transition-all duration-150 cursor-pointer border-l-4 border-l-orange-500/20"
                      onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{restaurant.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {restaurant.cuisine}
                            </Badge>
                            {restaurant.michelin_stars && (
                              <MichelinStars stars={restaurant.michelin_stars} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs truncate">{restaurant.city}</span>
                          </div>
                        </div>
                        <Heart className="h-5 w-5 text-orange-500 fill-orange-500" />
                      </div>
                    </Card>
                  ))}
                </div>

                {allWishlist.length === 0 && (
                  <Card className="p-8 text-center">
                    <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">No wishlist items</h3>
                    <p className="text-sm text-muted-foreground">No restaurants saved yet</p>
                  </Card>
                )}
              </TabsContent>

              {/* Mobile Itineraries Tab */}
              <TabsContent value="itineraries" className="space-y-4 mt-4">
                <FriendItinerariesTab friendId={actualUserId || ''} friendName={friend.name || friend.username} />
              </TabsContent>

              {/* Mobile Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4 mt-4">
                <div className="space-y-4">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-primary">{profileData.michelin_count || 0}</div>
                      <div className="text-xs text-muted-foreground">Michelin Stars</div>
                    </Card>
                    <Card className="p-3 text-center">
                      <div className="text-2xl font-bold text-blue-500">{topCuisines?.length || 0}</div>
                      <div className="text-xs text-muted-foreground">Cuisines Tried</div>
                    </Card>
                  </div>

                  {/* Top Cuisines - Mobile */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <ChefHat className="h-4 w-4 text-blue-500" />
                      Top Cuisines
                    </h3>
                    <div className="space-y-2">
                      {topCuisines.slice(0, 5).map((item: any) => (
                        <div key={item.cuisine} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.cuisine}</span>
                          <span className="text-sm text-muted-foreground">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Cities - Mobile */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <MapIcon className="h-4 w-4 text-red-500" />
                      Cities Explored
                    </h3>
                    <div className="text-center mb-3">
                      <div className="text-3xl font-bold text-red-500">{availableCities.length}</div>
                      <div className="text-xs text-muted-foreground">cities total</div>
                    </div>
                    <div className="space-y-2">
                      {availableCities.slice(0, 5).map(({ city, count }) => (
                        <div key={city} className="flex justify-between text-sm">
                          <span>{city}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop Tabs - Keep original */}
          <div className="hidden lg:block">
            <Tabs defaultValue="restaurants" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50">
                <TabsTrigger value="restaurants" className="flex items-center gap-2 text-sm">
                  <Utensils className="h-4 w-4" />
                  Restaurants ({filteredRestaurants.length})
                </TabsTrigger>
                <TabsTrigger value="wishlist" className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4" />
                  Wishlist ({allWishlist.length})
                </TabsTrigger>
                <TabsTrigger value="itineraries" className="flex items-center gap-2 text-sm">
                  <Route className="h-4 w-4" />
                  Travel Plans
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 text-sm">
                  <PieChart className="h-4 w-4" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              {/* Desktop Restaurants Tab */}
              <TabsContent value="restaurants" className="space-y-6 mt-6">
                {/* Filter Controls */}
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
                      {availableCuisines.filter(({ cuisine }) => cuisine && cuisine.trim() !== '').map(({ cuisine, count }) => (
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
                      {availableCities.filter(({ city }) => city && city.trim() !== '').map(({ city, count }) => (
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

              {/* Restaurant Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredRestaurants.map((restaurant) => (
                  <Card 
                    key={restaurant.id} 
                    className="overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer group bg-gradient-to-br from-card via-card to-muted/20 border-0 ring-1 ring-border/50 hover:ring-primary/50 hover:scale-[1.03]"
                    onClick={() => navigate(`/restaurant/${restaurant.id}?friendId=${actualUserId}`)}
                  >
                    {/* Header with Rating Badge */}
                    <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-6 pb-4">
                      <div className="absolute top-4 right-4">
                        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-3 py-2 rounded-xl shadow-lg">
                          <div className="text-xl font-bold text-center">
                            {restaurant.rating?.toFixed(1) || '—'}
                          </div>
                          <div className="text-xs opacity-90 text-center">rating</div>
                        </div>
                      </div>
                      
                      <div className="pr-20">
                        <h3 className="font-bold text-xl group-hover:text-primary transition-colors line-clamp-2 mb-3">
                          {restaurant.name}
                        </h3>
                        
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                            <ChefHat className="h-3 w-3 mr-1" />
                            {restaurant.cuisine}
                          </Badge>
                           {restaurant.michelin_stars && (
                             <div className="flex items-center gap-1">
                               <MichelinStars stars={restaurant.michelin_stars} />
                             </div>
                           )}
                           {restaurant.price_range && (
                             <div className="flex items-center gap-1">
                               <PriceRange priceRange={restaurant.price_range} readonly size="sm" />
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 pt-4 space-y-4">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="p-1.5 bg-muted/50 rounded-lg">
                          <MapPin className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium truncate">{restaurant.city}</span>
                      </div>

                      {restaurant.date_visited && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="p-1.5 bg-muted/50 rounded-lg">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <span className="text-sm">
                            Visited {new Date(restaurant.date_visited).toLocaleDateString()}
                          </span>
                        </div>
                      )}


                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gradient-to-r from-transparent via-border to-transparent">
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                          Added {new Date(restaurant.created_at).toLocaleDateString()}
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-9 px-4 text-xs font-medium group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg transition-all duration-300"
                        >
                          View Details
                          <ArrowLeft className="h-3 w-3 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
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

            {/* Wishlist Tab */}
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

            {/* Desktop Itineraries Tab */}
            <TabsContent value="itineraries" className="space-y-6 mt-6">
              <FriendItinerariesTab friendId={actualUserId || ''} friendName={friend.name || friend.username} />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Rating Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(ratingDistribution).map(([range, count]) => (
                      <div key={range} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{range}</span>
                        <div className="flex items-center gap-3 flex-1 ml-4">
                          <Progress 
                            value={((count as number) / (profileData.rated_count || 1)) * 100} 
                            className="h-3 flex-1"
                          />
                          <span className="text-sm text-muted-foreground w-8 text-right">{count as number}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ChefHat className="h-5 w-5 text-blue-500" />
                      Top Cuisines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topCuisines.slice(0, 8).map((item: any) => (
                      <div key={item.cuisine} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.cuisine}</span>
                        <div className="flex items-center gap-3">
                          <Progress 
                            value={(item.count / (profileData.rated_count || 1)) * 100} 
                            className="h-2 w-16"
                          />
                          <span className="text-sm text-muted-foreground w-6 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
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
          </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
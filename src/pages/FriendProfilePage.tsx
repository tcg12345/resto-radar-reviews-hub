import { useState, useEffect } from 'react';
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
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useFriends } from '@/hooks/useFriends';

export default function FriendProfilePage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { friends } = useFriends();
  const { fetchFriendRestaurants } = useFriendRestaurants();
  
  const [friend, setFriend] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (friendId && friends.length > 0) {
      const foundFriend = friends.find(f => f.id === friendId);
      if (foundFriend) {
        setFriend(foundFriend);
        loadFriendData(foundFriend);
      } else {
        // Friend not found, redirect back
        navigate('/');
      }
    }
  }, [friendId, friends, navigate]);

  const loadFriendData = async (friendData: any) => {
    setIsLoading(true);
    try {
      // Load stats data first (small sample for quick loading)
      const [statsData, wishlistData] = await Promise.all([
        fetchFriendRestaurants(friendData.id, false, 100), // Limit for stats calculation
        fetchFriendRestaurants(friendData.id, true)
      ]);
      
      const ratedRestaurants = statsData.filter(r => !r.is_wishlist);
      const wishlistItems = wishlistData.filter(r => r.is_wishlist);
      
      // For restaurants tab, we'll load paginated data when needed
      setRestaurants(ratedRestaurants.slice(0, 20)); // Show first 20 initially
      setWishlist(wishlistItems);
      
      // Calculate detailed stats
      calculateStats(ratedRestaurants, wishlistItems);
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (ratedRestaurants: any[], wishlistItems: any[]) => {
    const ratedWithScores = ratedRestaurants.filter(r => r.rating);
    
    if (ratedWithScores.length === 0) {
      setStats({
        averageRating: 0,
        totalRated: 0,
        totalWishlist: wishlistItems.length,
        topCuisines: [],
        ratingDistribution: {},
        michelinCount: 0,
        recentActivity: []
      });
      return;
    }

    // Average rating
    const avgRating = ratedWithScores.reduce((sum, r) => sum + r.rating, 0) / ratedWithScores.length;

    // Top cuisines
    const cuisineCounts: { [key: string]: number } = {};
    ratedRestaurants.forEach(r => {
      if (r.cuisine) {
        cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1;
      }
    });
    const topCuisines = Object.entries(cuisineCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cuisine, count]) => ({ cuisine, count }));

    // Rating distribution in ranges
    const ratingDistribution: { [key: string]: number } = {
      '0-2': 0,
      '2-4': 0,
      '4-6': 0,
      '6-8': 0,
      '8-10': 0
    };
    ratedWithScores.forEach(r => {
      const rating = r.rating;
      if (rating >= 0 && rating < 2) ratingDistribution['0-2']++;
      else if (rating >= 2 && rating < 4) ratingDistribution['2-4']++;
      else if (rating >= 4 && rating < 6) ratingDistribution['4-6']++;
      else if (rating >= 6 && rating < 8) ratingDistribution['6-8']++;
      else if (rating >= 8 && rating <= 10) ratingDistribution['8-10']++;
    });

    // Michelin starred restaurants
    const michelinCount = ratedRestaurants.filter(r => r.michelin_stars && r.michelin_stars > 0).length;

    // Recent activity (last 5 rated restaurants) - use created_at if date_visited is not available
    const recentActivity = ratedRestaurants
      .filter(r => r.date_visited || r.created_at)
      .sort((a, b) => {
        const dateA = new Date(a.date_visited || a.created_at);
        const dateB = new Date(b.date_visited || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);

    setStats({
      averageRating: avgRating,
      totalRated: ratedRestaurants.length,
      totalWishlist: wishlistItems.length,
      topCuisines,
      ratingDistribution,
      michelinCount,
      recentActivity
    });
  };

  if (isLoading || !friend) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Friends
            </Button>
          </div>
          
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={friend.avatar_url || ''} />
              <AvatarFallback className="text-3xl">
                {friend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">@{friend.username}</h1>
              {friend.name && (
                <p className="text-xl text-muted-foreground mb-4">{friend.name}</p>
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
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalRated}</div>
                  <div className="text-sm text-muted-foreground">Restaurants Rated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalWishlist}</div>
                  <div className="text-sm text-muted-foreground">Wishlist Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="restaurants">Rated ({stats.totalRated})</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist ({stats.totalWishlist})</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-8">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.recentActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {stats.recentActivity.map((restaurant: any) => (
                          <div key={restaurant.id} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{restaurant.name}</h4>
                              <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                               <p className="text-xs text-muted-foreground">
                                 {restaurant.date_visited 
                                   ? new Date(restaurant.date_visited).toLocaleDateString()
                                   : `Added: ${new Date(restaurant.created_at).toLocaleDateString()}`
                                 }
                               </p>
                            </div>
                            <div className="flex items-center gap-2">
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
                    {stats.topCuisines.length === 0 ? (
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
                           const count = stats.ratingDistribution[range] || 0;
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
            {restaurants.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">No rated restaurants yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {friend.username} hasn't rated any restaurants
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {restaurants.map((restaurant) => (
                  <Card key={restaurant.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-1">{restaurant.name}</h3>
                          <p className="text-muted-foreground mb-2">{restaurant.cuisine}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{restaurant.address}, {restaurant.city}</span>
                          </div>
                          {restaurant.date_visited && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Visited: {new Date(restaurant.date_visited).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right space-y-3">
                          {restaurant.rating && (
                            <div className="flex items-center gap-2">
                              <StarRating rating={restaurant.rating} readonly size="sm" />
                              <span className="font-bold text-lg">{restaurant.rating.toFixed(1)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 justify-end">
                            {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                            {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                          </div>
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
              </div>
            )}
          </TabsContent>

          {/* Wishlist Tab */}
          <TabsContent value="wishlist" className="mt-8">
            {wishlist.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">No wishlist items yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {friend.username} hasn't added any restaurants to their wishlist
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {wishlist.map((restaurant) => (
                  <Card key={restaurant.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-xl mb-1">{restaurant.name}</h3>
                          <p className="text-muted-foreground mb-2">{restaurant.cuisine}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{restaurant.address}, {restaurant.city}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-2 justify-end">
                            {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                            {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                          </div>
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
                    {stats.topCuisines.slice(0, 5).map(({ cuisine, count }: any, index: number) => (
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
                       const count = stats.ratingDistribution[range] || 0;
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
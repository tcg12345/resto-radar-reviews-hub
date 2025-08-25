import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  MapPin, 
  Heart, 
  Plus, 
  TrendingUp, 
  Award, 
  ChefHat,
  Calendar,
  Users,
  Clock,
  Utensils,
  ArrowRight,
  Bot,
  Mic,
  Search,
  Camera,
  Globe
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  onNavigate: (tab: 'places' | 'search' | 'profile') => void;
  onOpenAddRestaurant: () => void;
}

export default function HomePage({ onNavigate, onOpenAddRestaurant }: HomePageProps) {
  const { user, profile } = useAuth();
  const { restaurants } = useRestaurants();
  const navigate = useNavigate();
  const [rotatingCardIndex, setRotatingCardIndex] = useState(0);

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist);
  const wishlistRestaurants = restaurants.filter(r => r.isWishlist);
  const michelinRestaurants = ratedRestaurants.filter(r => r.michelinStars);
  
  const averageRating = ratedRestaurants.length > 0 
    ? ratedRestaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedRestaurants.length
    : 0;

  const recentRestaurants = [...ratedRestaurants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const highestRatedRestaurants = [...ratedRestaurants]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 3);

  const randomRestaurants = [...ratedRestaurants]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const recentWishlistRestaurants = [...wishlistRestaurants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const cuisineStats = ratedRestaurants.reduce((acc, r) => {
    acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCuisines = Object.entries(cuisineStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const topCuisineRestaurants = topCuisines.length > 0 
    ? ratedRestaurants.filter(r => r.cuisine === topCuisines[0][0]).slice(0, 3)
    : [];

  const cardRotationData = [
    {
      title: "Recently Rated",
      description: "Your latest dining experiences",
      restaurants: recentRestaurants,
      icon: Clock
    },
    {
      title: "Highest Rated",
      description: "Your top-rated restaurants",
      restaurants: highestRatedRestaurants,
      icon: Star
    },
    {
      title: "Random Picks",
      description: "A random selection from your collection",
      restaurants: randomRestaurants,
      icon: TrendingUp
    },
    {
      title: "Recently Added",
      description: "Latest additions to your wishlist",
      restaurants: recentWishlistRestaurants,
      icon: Heart
    },
    {
      title: "Top Cuisine",
      description: `From your favorite ${topCuisines.length > 0 ? topCuisines[0][0] : 'cuisine'}`,
      restaurants: topCuisineRestaurants,
      icon: ChefHat
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingCardIndex((prev) => (prev + 1) % cardRotationData.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [cardRotationData.length]);

  const currentCardData = cardRotationData[rotatingCardIndex];

  const quickActions = [
    {
      title: 'AI Discovery',
      description: 'Find restaurants with smart search',
      icon: Bot,
      color: 'bg-purple-500',
      action: () => onNavigate('search')
    },
    {
      title: 'Add Restaurant',
      description: 'Rate a new dining experience',
      icon: Plus,
      color: 'bg-green-500',
      action: onOpenAddRestaurant
    },
    {
      title: 'View Map',
      description: 'Explore your restaurants',
      icon: MapPin,
      color: 'bg-blue-500',
      action: () => navigate('/map')
    },
    {
      title: 'Wishlist',
      description: 'Places you want to try',
      icon: Heart,
      color: 'bg-red-500',
      action: () => onNavigate('places')
    },
    {
      title: 'My Ratings',
      description: 'View all your reviews',
      icon: Star,
      color: 'bg-yellow-500',
      action: () => onNavigate('places')
    },
    {
      title: 'Friends',
      description: 'Connect with food lovers',
      icon: Users,
      color: 'bg-indigo-500',
      action: () => onNavigate('profile')
    }
  ];

  const stats = [
    {
      title: 'Restaurants Rated',
      value: ratedRestaurants.length,
      icon: Utensils,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Wishlist Items',
      value: wishlistRestaurants.length,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Michelin Stars',
      value: michelinRestaurants.reduce((sum, r) => sum + (r.michelinStars || 0), 0),
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Average Rating',
      value: averageRating.toFixed(1),
      icon: Star,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = () => {
    if (profile?.name) {
      const firstName = profile.name.split(' ')[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      // Handle cases like "tyler.gorin" or "tyler_gorin"
      const firstName = emailName.split(/[._]/)[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return 'Food Lover';
  };

  return (
    <>
      {/* Mobile Feed Layout */}
      <div className="md:hidden min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="bg-background/95 backdrop-blur-sm px-4 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">
                {getGreeting()}, {getFirstName()}! 👋
              </h1>
            </div>
          </div>
        </div>

        {/* Feed Content */}
        <div className="space-y-4 pb-20">
          {/* Recently Rated Carousel */}
          <div className="space-y-3 px-4">
            <h2 className="text-lg font-semibold text-foreground">Recently Rated</h2>
            {recentRestaurants.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {recentRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex-shrink-0 w-64">
                    <Card className="h-32 bg-card border border-border shadow-sm overflow-hidden">
                      <CardContent className="p-0 h-full">
                        <div className="flex h-full">
                          <div className="w-20 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <ChefHat className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <h4 className="font-semibold text-sm text-foreground truncate">{restaurant.name}</h4>
                              <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                              <p className="text-xs text-muted-foreground">{restaurant.city}</p>
                            </div>
                            {restaurant.rating && (
                              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md w-fit">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold text-xs text-yellow-700">{restaurant.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="bg-card border border-border">
                <CardContent className="p-6 text-center">
                  <Utensils className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No restaurants rated yet</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Feed Cards */}
          <div className="space-y-4 px-4">
            {/* Your Progress Card */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      You've rated {ratedRestaurants.length} restaurants! 🎉
                    </p>
                    <p className="text-xs text-blue-700">Keep exploring new flavors</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Friend Activity Placeholder Cards */}
            <Card className="bg-card border border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold text-sm">
                    S
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-foreground">Sarah</span>
                      <span className="text-xs text-muted-foreground">rated</span>
                      <span className="font-medium text-sm text-foreground">Le Bernardin</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-md">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-xs text-yellow-700">9.1</span>
                      </div>
                      <span className="text-xs text-muted-foreground">French • Manhattan</span>
                    </div>
                    <p className="text-sm text-foreground mb-3">"Absolutely incredible! The seafood was perfection."</p>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <button className="flex items-center gap-1 text-xs hover:text-foreground">
                        <Heart className="h-4 w-4" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:text-foreground">
                        <span>💬</span>
                        <span>Comment</span>
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:text-foreground">
                        <ArrowRight className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wishlist Activity Card */}
            <Card className="bg-card border border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    M
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-foreground">Mike</span>
                      <span className="text-xs text-muted-foreground">added to wishlist</span>
                    </div>
                    <Card className="bg-gray-50 border border-gray-200">
                      <CardContent className="p-3">
                        <div className="flex gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-lg flex items-center justify-center">
                            <ChefHat className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-foreground">Nobu Downtown</h4>
                            <p className="text-xs text-muted-foreground">Japanese • Tribeca</p>
                            <p className="text-xs text-muted-foreground mt-1">Upscale sushi and Japanese fusion</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <div className="flex items-center gap-4 text-muted-foreground mt-3">
                      <button className="flex items-center gap-1 text-xs hover:text-foreground">
                        <Heart className="h-4 w-4" />
                        <span>Like</span>
                      </button>
                      <button className="flex items-center gap-1 text-xs hover:text-foreground">
                        <span>💬</span>
                        <span>Comment</span>
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trending Among Friends Carousel */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">Trending Among Friends</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {highestRatedRestaurants.slice(0, 5).map((restaurant) => (
                  <div key={restaurant.id} className="flex-shrink-0 w-48">
                    <Card className="bg-card border border-border">
                      <CardContent className="p-3">
                        <div className="w-full h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mb-3">
                          <ChefHat className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-semibold text-sm text-foreground truncate">{restaurant.name}</h4>
                        <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">{restaurant.city}</p>
                          {restaurant.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-xs text-yellow-700">{restaurant.rating}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Activity Card */}
            <Card className="bg-card border border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {getFirstName().charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-sm text-foreground">You</span>
                      <span className="text-xs text-muted-foreground">have</span>
                      <span className="font-medium text-sm text-foreground">{wishlistRestaurants.length} restaurants</span>
                      <span className="text-xs text-muted-foreground">in your wishlist</span>
                    </div>
                    <p className="text-sm text-foreground mb-3">Ready to explore some new flavors?</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => onNavigate('places')}
                    >
                      View Wishlist
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cuisine Favorites Carousel */}
            {topCuisines.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Your Favorite: {topCuisines[0][0]}</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {topCuisineRestaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex-shrink-0 w-48">
                      <Card className="bg-card border border-border">
                        <CardContent className="p-3">
                          <div className="w-full h-20 bg-gradient-to-br from-orange-200 to-orange-100 rounded-lg flex items-center justify-center mb-3">
                            <ChefHat className="h-6 w-6 text-orange-600" />
                          </div>
                          <h4 className="font-semibold text-sm text-foreground truncate">{restaurant.name}</h4>
                          <p className="text-xs text-muted-foreground">{restaurant.cuisine}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">{restaurant.city}</p>
                            {restaurant.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold text-xs text-yellow-700">{restaurant.rating}</span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Feed Layout */}
      <div className="hidden md:block w-full max-w-4xl mx-auto py-6 space-y-6 px-4 lg:px-6">
        {/* Desktop Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {getGreeting()}, {getFirstName()}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">Your restaurant feed</p>
        </div>

        {/* Recently Rated Carousel */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Recently Rated</h2>
          {recentRestaurants.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {recentRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex-shrink-0 w-80">
                  <Card className="h-40 bg-card border border-border shadow-sm">
                    <CardContent className="p-0 h-full">
                      <div className="flex h-full">
                        <div className="w-32 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <ChefHat className="h-8 w-8 text-primary" />
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-lg text-foreground">{restaurant.name}</h4>
                            <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                            <p className="text-sm text-muted-foreground">{restaurant.city}</p>
                          </div>
                          {restaurant.rating && (
                            <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg w-fit">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-sm text-yellow-700">{restaurant.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-card border border-border">
              <CardContent className="p-8 text-center">
                <Utensils className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">No restaurants rated yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Feed Cards */}
        <div className="space-y-6">
          {/* Your Progress Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-lg font-medium text-blue-900">
                    You've rated {ratedRestaurants.length} restaurants! 🎉
                  </p>
                  <p className="text-sm text-blue-700">Keep exploring new flavors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Friend Activity Placeholder Cards */}
          <Card className="bg-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center text-white font-semibold">
                  S
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold text-lg text-foreground">Sarah</span>
                    <span className="text-sm text-muted-foreground">rated</span>
                    <span className="font-medium text-lg text-foreground">Le Bernardin</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-sm text-yellow-700">9.1</span>
                    </div>
                    <span className="text-sm text-muted-foreground">French • Manhattan</span>
                  </div>
                  <p className="text-base text-foreground mb-4">"Absolutely incredible! The seafood was perfection."</p>
                  <div className="flex items-center gap-6 text-muted-foreground">
                    <button className="flex items-center gap-2 text-sm hover:text-foreground">
                      <Heart className="h-5 w-5" />
                      <span>Like</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm hover:text-foreground">
                      <span>💬</span>
                      <span>Comment</span>
                    </button>
                    <button className="flex items-center gap-2 text-sm hover:text-foreground">
                      <ArrowRight className="h-5 w-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trending Among Friends Carousel */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-foreground">Trending Among Friends</h3>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {highestRatedRestaurants.slice(0, 5).map((restaurant) => (
                <div key={restaurant.id} className="flex-shrink-0 w-64">
                  <Card className="bg-card border border-border">
                    <CardContent className="p-4">
                      <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <ChefHat className="h-8 w-8 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg text-foreground truncate">{restaurant.name}</h4>
                      <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-sm text-muted-foreground">{restaurant.city}</p>
                        {restaurant.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-sm text-yellow-700">{restaurant.rating}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Your Activity Card */}
          <Card className="bg-card border border-border">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white font-semibold">
                  {getFirstName().charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold text-lg text-foreground">You</span>
                    <span className="text-sm text-muted-foreground">have</span>
                    <span className="font-medium text-lg text-foreground">{wishlistRestaurants.length} restaurants</span>
                    <span className="text-sm text-muted-foreground">in your wishlist</span>
                  </div>
                  <p className="text-base text-foreground mb-4">Ready to explore some new flavors?</p>
                  <Button 
                    variant="outline" 
                    className="text-sm"
                    onClick={() => onNavigate('places')}
                  >
                    View Wishlist
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cuisine Favorites Carousel */}
          {topCuisines.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-2xl font-semibold text-foreground">Your Favorite: {topCuisines[0][0]}</h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {topCuisineRestaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex-shrink-0 w-64">
                    <Card className="bg-card border border-border">
                      <CardContent className="p-4">
                        <div className="w-full h-32 bg-gradient-to-br from-orange-200 to-orange-100 rounded-lg flex items-center justify-center mb-4">
                          <ChefHat className="h-8 w-8 text-orange-600" />
                        </div>
                        <h4 className="font-semibold text-lg text-foreground truncate">{restaurant.name}</h4>
                        <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-sm text-muted-foreground">{restaurant.city}</p>
                          {restaurant.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold text-sm text-yellow-700">{restaurant.rating}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

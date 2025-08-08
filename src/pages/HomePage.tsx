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
      {/* Mobile Layout - Completely Redesigned */}
      <div className="md:hidden min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="bg-background/95 backdrop-blur-sm px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-primary">
                {getGreeting()}, {getFirstName()}! 👋
              </h1>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4 space-y-6 pb-20">
          {/* Stats Cards - Mobile Optimized */}
          <div className="grid grid-cols-2 gap-3">
            {stats.slice(0, 4).map((stat, index) => (
              <Card key={index} className="bg-card/90 backdrop-blur-sm border border-border shadow-sm">
                <CardContent className="p-3 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{stat.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions - Mobile Grid */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.slice(0, 6).map((action, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer active:scale-95 transition-all duration-200 bg-card/90 backdrop-blur-sm border border-border shadow-sm hover:shadow-md"
                  onClick={action.action}
                >
                  <CardContent className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                    <div className="text-center space-y-3">
                      <div className={`p-3 rounded-2xl ${action.color} text-white mx-auto w-fit shadow-lg`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{action.title}</h3>
                        <p className="text-xs text-muted-foreground leading-tight mt-1">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Featured Content - Mobile Carousel Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Featured</h2>
              <div className="flex space-x-1">
                {cardRotationData.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                      index === rotatingCardIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <Card className="bg-white/60 backdrop-blur-sm border border-primary/10 shadow-sm overflow-hidden">
              <CardContent className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <currentCardData.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{currentCardData.title}</h3>
                    <p className="text-xs text-muted-foreground">{currentCardData.description}</p>
                  </div>
                </div>
                
                {currentCardData.restaurants.length > 0 ? (
                  <div className="space-y-3">
                    {currentCardData.restaurants.slice(0, 3).map((restaurant) => (
                      <div key={restaurant.id} className="flex items-center space-x-3 p-3 rounded-xl bg-background/50 border border-primary/5">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
                            <ChefHat className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">{restaurant.name}</h4>
                          <p className="text-xs text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                        </div>
                        {restaurant.rating && (
                          <div className="flex items-center space-x-1 bg-yellow-50 px-2 py-1 rounded-lg">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-xs text-yellow-700">{restaurant.rating}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      className="w-full mt-3 border-primary/20 text-primary hover:bg-primary/5"
                      onClick={() => onNavigate('places')}
                    >
                      View All
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Utensils className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No restaurants yet</p>
                    <p className="text-xs">Start your journey!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cuisine Insights - Mobile Optimized */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Your Favorites</h2>
            <Card className="bg-white/60 backdrop-blur-sm border border-primary/10 shadow-sm">
              <CardContent className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
                {topCuisines.length > 0 ? (
                  <div className="space-y-4">
                    {topCuisines.slice(0, 3).map(([cuisine, count], index) => (
                      <div key={cuisine} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm text-foreground">{cuisine}</span>
                          <span className="text-xs text-muted-foreground">{count} places</span>
                        </div>
                        <Progress 
                          value={(count / ratedRestaurants.length) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-primary/10">
                      <div className="text-center flex-1">
                        <div className="text-lg font-bold text-primary">{averageRating.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Rating</div>
                      </div>
                      {michelinRestaurants.length > 0 && (
                        <div className="text-center flex-1 border-l border-primary/10">
                          <div className="text-lg font-bold text-yellow-600">{michelinRestaurants.length}</div>
                          <div className="text-xs text-muted-foreground">Michelin ⭐</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <ChefHat className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No cuisine data yet</p>
                    <p className="text-xs">Rate restaurants to see insights!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Features Highlight - Mobile */}
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">AI-Powered Discovery</h3>
                  <p className="text-xs text-muted-foreground">Smart restaurant recommendations</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
                  <Search className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-xs text-foreground">Smart Search</div>
                    <div className="text-xs text-muted-foreground">Natural language queries</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-background/50">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-xs text-foreground">Personal Recommendations</div>
                    <div className="text-xs text-muted-foreground">AI-curated for you</div>
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-medium"
                onClick={() => onNavigate('search')}
              >
                <Bot className="h-4 w-4 mr-2" />
                Try AI Discovery
              </Button>
            </CardContent>
          </Card>

          {/* Motivational Section - Mobile */}
          {ratedRestaurants.length > 0 ? (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-green-800 mb-2">
                  Great Progress!
                </h3>
                <p className="text-xs text-green-700 mb-3">
                  You've explored {ratedRestaurants.length} restaurants. Keep discovering!
                </p>
                <Button 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={onOpenAddRestaurant}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Another
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-3">
                  <Utensils className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-2">
                  Start Your Culinary Journey
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Rate your first restaurant and unlock personalized AI recommendations
                </p>
                <Button 
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={onOpenAddRestaurant}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add First Restaurant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Desktop Layout - Full Width */}
      <div className="hidden md:block w-full max-w-none py-6 space-y-8 mobile-container px-4 lg:px-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {getGreeting()}, {getFirstName()}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Welcome back to your AI-powered culinary discovery dashboard
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>Your personal AI assistant is ready to help you discover amazing restaurants</span>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 lg:pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-1.5 lg:p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-3 w-3 lg:h-4 lg:w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 lg:pb-4">
                <div className="text-lg lg:text-2xl font-bold">{stat.value}</div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 pointer-events-none" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3 lg:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl lg:text-2xl font-semibold">Quick Actions</h2>
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              <Bot className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-1" />
              AI-Enhanced
            </Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {quickActions.map((action, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 group border-2 hover:border-primary/20"
                onClick={action.action}
              >
                <CardContent className="p-3 lg:p-6">
                  <div className="flex lg:items-center space-x-2 lg:space-x-4 flex-col lg:flex-row">
                    <div className={`p-2 lg:p-3 rounded-full ${action.color} text-white group-hover:scale-110 transition-transform shadow-lg self-start lg:self-auto`}>
                      <action.icon className="h-4 w-4 lg:h-6 lg:w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm lg:text-base group-hover:text-primary transition-colors">{action.title}</h3>
                      <p className="text-xs lg:text-sm text-muted-foreground">{action.description}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all hidden lg:block" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* AI Features Highlight */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="flex items-center space-x-2 lg:space-x-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                  <Bot className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg font-semibold">AI-Powered Features</h3>
                  <p className="text-xs lg:text-sm text-muted-foreground">Discover the smart way to find restaurants</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 lg:gap-4">
              <div className="flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 rounded-lg bg-background/50">
                <Search className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                <div>
                  <div className="font-medium text-xs lg:text-sm">Smart Discovery</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">Natural language search</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 rounded-lg bg-background/50">
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                <div>
                  <div className="font-medium text-xs lg:text-sm">Personalized Recs</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">AI-curated suggestions</div>
                </div>
              </div>
              <div className="flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 rounded-lg bg-background/50">
                <Mic className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                <div>
                  <div className="font-medium text-xs lg:text-sm">Voice Assistant</div>
                  <div className="text-xs text-muted-foreground hidden lg:block">Hands-free search</div>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full mt-3 lg:mt-4 border-primary/30 hover:bg-primary/10 text-sm"
              onClick={() => onNavigate('search')}
            >
              Try AI Discovery Now
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rotating Restaurant Card */}
          <Card className="transition-all duration-500 ease-in-out">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentCardData.icon className="h-5 w-5" />
                {currentCardData.title}
              </CardTitle>
              <CardDescription>
                {currentCardData.description}
              </CardDescription>
              <div className="flex space-x-1 mt-2">
                {cardRotationData.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 w-8 rounded-full transition-all duration-300 ${
                      index === rotatingCardIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentCardData.restaurants.length > 0 ? (
                <>
                  {currentCardData.restaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                          <ChefHat className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{restaurant.name}</h4>
                        <p className="text-sm text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{restaurant.rating}</span>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => onNavigate('places')}
                  >
                    View All Ratings
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No restaurants rated yet</p>
                  <p className="text-sm">Start your culinary journey!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cuisine Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Your Cuisine Preferences
              </CardTitle>
              <CardDescription>
                Most visited cuisine types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topCuisines.length > 0 ? (
                <>
                  {topCuisines.map(([cuisine, count], index) => (
                    <div key={cuisine} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{cuisine}</span>
                        <span className="text-sm text-muted-foreground">{count} restaurants</span>
                      </div>
                      <Progress 
                        value={(count / ratedRestaurants.length) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Average Rating</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {averageRating.toFixed(1)} ⭐
                      </Badge>
                    </div>
                    {michelinRestaurants.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span>Michelin Experience</span>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {michelinRestaurants.length} starred
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cuisine data yet</p>
                  <p className="text-sm">Start rating restaurants to see insights!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Motivational Section */}
        {ratedRestaurants.length > 0 ? (
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                <div className="space-y-2">
                  <h3 className="text-base lg:text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                    You're Building an Amazing Collection!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {ratedRestaurants.length} restaurants rated • {wishlistRestaurants.length} on your wishlist
                  </p>
                </div>
                <Button onClick={onOpenAddRestaurant} className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Restaurant
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
                <Utensils className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Your Culinary Journey</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Rate your first restaurant and unlock personalized AI recommendations
              </p>
              <Button onClick={onOpenAddRestaurant} size="lg" className="bg-primary hover:bg-primary/90 text-white">
                <Plus className="h-5 w-5 mr-2" />
                Add Your First Restaurant
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

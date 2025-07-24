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
  onNavigate: (tab: 'rated' | 'wishlist' | 'search' | 'friends') => void;
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
      action: () => onNavigate('wishlist')
    },
    {
      title: 'My Ratings',
      description: 'View all your reviews',
      icon: Star,
      color: 'bg-yellow-500',
      action: () => onNavigate('rated')
    },
    {
      title: 'Friends',
      description: 'Connect with food lovers',
      icon: Users,
      color: 'bg-indigo-500',
      action: () => onNavigate('friends')
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
    <div className="container py-6 space-y-8 mobile-container px-4 sm:px-6">
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
      <Card className="hidden lg:block bg-gradient-to-r from-primary/5 via-primary/5 to-secondary/5 border-primary/20">
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
                  onClick={() => onNavigate('rated')}
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
          <CardContent className="hidden lg:block lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
              <div className="space-y-2">
                <h3 className="text-base lg:text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                  Keep Exploring! 🍽️
                </h3>
                <p className="text-sm text-muted-foreground">
                  You've rated {ratedRestaurants.length} restaurants. 
                  {wishlistRestaurants.length > 0 && ` ${wishlistRestaurants.length} more waiting in your wishlist!`}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    Average: {averageRating.toFixed(1)} ⭐
                  </Badge>
                  {michelinRestaurants.length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                      {michelinRestaurants.length} Michelin ⭐
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onNavigate('wishlist')} variant="outline" size="sm">
                  <Heart className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">Wishlist</span>
                </Button>
                <Button onClick={() => onNavigate('search')} className="bg-gradient-to-r from-primary to-primary-glow" size="sm">
                  <Bot className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">AI Discovery</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6 lg:p-8 text-center">
            <div className="space-y-3 lg:space-y-4">
              <div className="w-12 h-12 lg:w-16 lg:h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
                <Bot className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <h3 className="text-lg lg:text-xl font-semibold">Start Your Culinary Journey!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Use our AI-powered discovery to find amazing restaurants, or add your first dining experience to get personalized recommendations.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 justify-center">
                <Button onClick={() => onNavigate('search')} className="bg-gradient-to-r from-primary to-primary-glow" size="sm">
                  <Search className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">Try AI Discovery</span>
                </Button>
                <Button onClick={onOpenAddRestaurant} variant="outline" size="sm">
                  <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                  <span className="text-xs lg:text-sm">Add First Restaurant</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
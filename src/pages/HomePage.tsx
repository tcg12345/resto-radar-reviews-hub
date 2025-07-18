import { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';

interface HomePageProps {
  onNavigate: (tab: 'rated' | 'wishlist' | 'map') => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const { user } = useAuth();
  const { restaurants } = useRestaurants();

  const ratedRestaurants = restaurants.filter(r => !r.isWishlist);
  const wishlistRestaurants = restaurants.filter(r => r.isWishlist);
  const michelinRestaurants = ratedRestaurants.filter(r => r.michelinStars);
  
  const averageRating = ratedRestaurants.length > 0 
    ? ratedRestaurants.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedRestaurants.length
    : 0;

  const recentRestaurants = [...ratedRestaurants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const cuisineStats = ratedRestaurants.reduce((acc, r) => {
    acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCuisines = Object.entries(cuisineStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const quickActions = [
    {
      title: 'Add Restaurant',
      description: 'Rate a new dining experience',
      icon: Plus,
      color: 'bg-green-500',
      action: () => onNavigate('rated')
    },
    {
      title: 'View Map',
      description: 'Explore your restaurants',
      icon: MapPin,
      color: 'bg-blue-500',
      action: () => onNavigate('map')
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

  return (
    <div className="container py-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">
          {getGreeting()}, {user?.email?.split('@')[0] || 'Food Lover'}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back to your culinary journey dashboard
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 pointer-events-none" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
              onClick={action.action}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Restaurants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Rated
            </CardTitle>
            <CardDescription>
              Your latest dining experiences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentRestaurants.length > 0 ? (
              <>
                {recentRestaurants.map((restaurant) => (
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

      {/* Motivational Section */}
      {ratedRestaurants.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Keep Exploring! 🍽️</h3>
                <p className="text-muted-foreground">
                  You've rated {ratedRestaurants.length} restaurants. 
                  {wishlistRestaurants.length > 0 && ` ${wishlistRestaurants.length} more waiting in your wishlist!`}
                </p>
              </div>
              <Button onClick={() => onNavigate('wishlist')} className="ml-4">
                Explore Wishlist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
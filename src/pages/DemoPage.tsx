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
  ArrowRight,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { GrubbyLogo } from '@/components/GrubbyLogo';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Mock data for demo
const mockRestaurants = [
  {
    id: '1',
    name: 'Le Bernardin',
    cuisine: 'French',
    city: 'New York',
    rating: 9.5,
    michelinStars: 3,
    isWishlist: false,
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Eleven Madison Park',
    cuisine: 'Contemporary',
    city: 'New York',
    rating: 9.2,
    michelinStars: 3,
    isWishlist: false,
    updatedAt: '2024-01-14T15:30:00Z'
  },
  {
    id: '3',
    name: 'Osteria Francescana',
    cuisine: 'Italian',
    city: 'Modena',
    rating: 9.8,
    michelinStars: 3,
    isWishlist: false,
    updatedAt: '2024-01-13T20:00:00Z'
  },
  {
    id: '4',
    name: 'Noma',
    cuisine: 'Nordic',
    city: 'Copenhagen',
    rating: 0,
    michelinStars: 0,
    isWishlist: true,
    updatedAt: '2024-01-12T12:00:00Z'
  },
  {
    id: '5',
    name: 'The French Laundry',
    cuisine: 'American',
    city: 'Yountville',
    rating: 0,
    michelinStars: 0,
    isWishlist: true,
    updatedAt: '2024-01-11T18:00:00Z'
  }
];

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'rated' | 'wishlist' | 'map'>('home');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const ratedRestaurants = mockRestaurants.filter(r => !r.isWishlist);
  const wishlistRestaurants = mockRestaurants.filter(r => r.isWishlist);
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

  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Clock },
    { id: 'rated' as const, label: 'My Ratings', icon: Star },
    { id: 'wishlist' as const, label: 'Wishlist', icon: Heart },
    { id: 'map' as const, label: 'Map View', icon: MapPin },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="container py-6 space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                {getGreeting()}, Demo User! 👋
              </h1>
              <p className="text-muted-foreground text-lg">
                Welcome to the Grubby demo - explore the features!
              </p>
            </div>

            {/* Demo Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a demo version. Changes won't be saved. <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>Sign up</Button> to start your real culinary journey!
              </AlertDescription>
            </Alert>

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
                {[
                  { title: 'Add Restaurant', description: 'Rate a new dining experience', icon: Plus, color: 'bg-green-500' },
                  { title: 'View Map', description: 'Explore your restaurants', icon: MapPin, color: 'bg-blue-500' },
                  { title: 'Wishlist', description: 'Places you want to try', icon: Heart, color: 'bg-red-500' },
                  { title: 'My Ratings', description: 'View all your reviews', icon: Star, color: 'bg-yellow-500' }
                ].map((action, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-200 group">
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

            {/* Recent Activity */}
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
              </CardContent>
            </Card>
          </div>
        );
      case 'rated':
        return (
          <div className="container py-6 space-y-6">
            <h1 className="text-3xl font-bold">My Ratings</h1>
            <div className="grid gap-4">
              {ratedRestaurants.map((restaurant) => (
                <Card key={restaurant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                        <p className="text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{restaurant.rating}</span>
                        {restaurant.michelinStars > 0 && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {restaurant.michelinStars} ⭐
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'wishlist':
        return (
          <div className="container py-6 space-y-6">
            <h1 className="text-3xl font-bold">Wishlist</h1>
            <div className="grid gap-4">
              {wishlistRestaurants.map((restaurant) => (
                <Card key={restaurant.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{restaurant.name}</h3>
                        <p className="text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                      </div>
                      <Heart className="h-5 w-5 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'map':
        return (
          <div className="container py-6 space-y-6">
            <h1 className="text-3xl font-bold">Map View</h1>
            <Card>
              <CardContent className="p-6">
                <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">Interactive map would appear here</p>
                    <p className="text-sm text-muted-foreground">Sign up to see your restaurants on the map!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate('/')}>
            <GrubbyLogo size="md" />
          </div>

          <div className="flex items-center space-x-1 rounded-lg bg-muted/50 p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2 transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {renderContent()}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bot,
  Plus,
  MapPin,
  Heart,
  Star,
  Utensils,
  ChefHat,
  Clock,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface HomePageProps {
  onNavigate: (tab: 'places' | 'search' | 'profile') => void;
  onOpenAddRestaurant: () => void;
}

export default function HomePage({ onNavigate, onOpenAddRestaurant }: HomePageProps) {
  const { user, profile } = useAuth();
  const { restaurants } = useRestaurants();
  const navigate = useNavigate();

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

  const recentWishlistRestaurants = [...wishlistRestaurants]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const cuisineStats = ratedRestaurants.reduce((acc, r) => {
    acc[r.cuisine] = (acc[r.cuisine] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCuisines = Object.entries(cuisineStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const quickActions = [
    {
      title: 'AI Search',
      icon: Bot,
      color: 'bg-purple-500',
      action: () => onNavigate('search')
    },
    {
      title: 'Add',
      icon: Plus,
      color: 'bg-green-500',
      action: onOpenAddRestaurant
    },
    {
      title: 'Map',
      icon: MapPin,
      color: 'bg-blue-500',
      action: () => navigate('/map')
    },
    {
      title: 'Wishlist',
      icon: Heart,
      color: 'bg-red-500',
      action: () => onNavigate('places')
    }
  ];

  const stats = [
    {
      title: 'Rated',
      value: ratedRestaurants.length,
      icon: Utensils,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Wishlist',
      value: wishlistRestaurants.length,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Michelin',
      value: michelinRestaurants.reduce((sum, r) => sum + (r.michelinStars || 0), 0),
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Avg Rating',
      value: averageRating.toFixed(1),
      icon: Star,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  const cardRotationData = [
    {
      title: 'Recently Rated',
      description: 'Your latest dining experiences',
      restaurants: recentRestaurants,
      icon: Clock
    },
    {
      title: 'Top Rated',
      description: 'Your highest rated spots',
      restaurants: highestRatedRestaurants,
      icon: Star
    },
    {
      title: 'Wishlist',
      description: 'Places you want to try',
      restaurants: recentWishlistRestaurants,
      icon: Heart
    }
  ];

  const [rotatingCardIndex, setRotatingCardIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRotatingCardIndex(prev => (prev + 1) % cardRotationData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [cardRotationData.length]);

  const currentCardData = cardRotationData[rotatingCardIndex];

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
      const firstName = emailName.split(/[._]/)[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return 'Food Lover';
  };

  const handleSearchFocus = () => onNavigate('search');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-4 shadow">
        <h1 className="text-xl font-semibold">
          {getGreeting()}, {getFirstName()}!
        </h1>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/70" />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-full text-sm placeholder:text-primary-foreground/70 bg-primary-foreground text-primary"
            placeholder="Search restaurants"
            onFocus={handleSearchFocus}
          />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-8 pb-20">
        <section>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(action => (
              <button
                key={action.title}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-card shadow-sm active:scale-95 transition"
                onClick={action.action}
              >
                <div className={`p-2 rounded-lg ${action.color} text-white mb-1`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{action.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Your Stats</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {stats.map(stat => (
              <Card key={stat.title} className="min-w-[8rem]">
                <CardContent className="p-3 flex flex-col items-center text-center">
                  <div className={`p-2 rounded-lg ${stat.bgColor} mb-2`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.title}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{currentCardData.title}</h2>
            <Badge>{currentCardData.description}</Badge>
          </div>
          <Card>
            <CardContent className="p-4 space-y-3">
              {currentCardData.restaurants.length > 0 ? (
                <>
                  {currentCardData.restaurants.map(restaurant => (
                    <div key={restaurant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm">{restaurant.name}</h3>
                        <p className="text-xs text-muted-foreground">{restaurant.cuisine} • {restaurant.city}</p>
                      </div>
                      {restaurant.rating && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-sm">{restaurant.rating}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" className="w-full" onClick={() => onNavigate('places')}>
                    View All
                  </Button>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Utensils className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No restaurants yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Your Favorites</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              {topCuisines.length > 0 ? (
                <>
                  {topCuisines.map(([cuisine, count]) => (
                    <div key={cuisine} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cuisine}</span>
                        <span className="text-muted-foreground">{count} places</span>
                      </div>
                      <Progress value={(count / ratedRestaurants.length) * 100} className="h-2" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4 text-sm">
                    <div>
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="ml-1 text-muted-foreground">Avg Rating</span>
                    </div>
                    {michelinRestaurants.length > 0 && (
                      <div>
                        <span className="font-semibold">{michelinRestaurants.length}</span>
                        <span className="ml-1 text-muted-foreground">Michelin ⭐</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No cuisine data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}


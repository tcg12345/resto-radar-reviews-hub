import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Star, Heart, MapPin, Clock, Filter, SortAsc, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { StarRating } from '@/components/StarRating';

interface FriendRestaurant {
  id: string;
  name: string;
  cuisine: string;
  rating?: number;
  address: string;
  city: string;
  country?: string;
  price_range?: number;
  michelin_stars?: number;
  date_visited?: string;
  created_at: string;
  notes?: string;
  photos?: string[];
  is_wishlist: boolean;
  friend: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
}

type SortOption = 'recent' | 'rating' | 'alphabetical' | 'friend';
type FilterOption = 'all' | 'rated' | 'wishlist';
type CityFilterOption = string | 'all';

export function FriendsActivityPage() {
  const { user } = useAuth();
  const [friendsRestaurants, setFriendsRestaurants] = useState<FriendRestaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<FriendRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityFilterOption>('all');

  // Memoize expensive calculations
  const uniqueCuisines = React.useMemo(() => {
    const cuisines = friendsRestaurants.map(r => r.cuisine);
    return [...new Set(cuisines)].sort();
  }, [friendsRestaurants]);

  const uniqueCities = React.useMemo(() => {
    const cities = friendsRestaurants.map(r => r.city);
    return [...new Set(cities)].sort();
  }, [friendsRestaurants]);

  useEffect(() => {
    if (user) {
      fetchFriendsRestaurants();
    }
  }, [user]);

  // Debounce filtering for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      filterAndSortRestaurants();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [friendsRestaurants, searchQuery, sortBy, filterBy, selectedCuisines, selectedCity]);

  const fetchFriendsRestaurants = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Use the optimized cached function for instant loading
      await fetchFriendsRestaurantsSimple();
    } catch (error) {
      console.error('Error fetching friends restaurants:', error);
      toast('Failed to load friends\' restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized approach using existing database functions
  const fetchFriendsRestaurantsSimple = async () => {
    if (!user) return;

    try {
      // Get friends first
      const { data: friendsData, error: friendsError } = await supabase
        .rpc('get_friends_with_scores', { requesting_user_id: user.id });

      if (friendsError || !friendsData?.length) {
        setFriendsRestaurants([]);
        return;
      }

      const friendIds = friendsData.map(f => f.friend_id);

      // Get all restaurants from friends in one efficient query
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, photos, is_wishlist, user_id')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false });

      if (restaurantsError) {
        console.error('Error fetching restaurants:', restaurantsError);
        return;
      }

      // Transform data with friend info
      const formattedRestaurants: FriendRestaurant[] = (restaurantsData || []).map(restaurant => {
        const friend = friendsData.find(f => f.friend_id === restaurant.user_id);
        return {
          id: restaurant.id,
          name: restaurant.name,
          cuisine: restaurant.cuisine || 'Unknown',
          rating: restaurant.rating,
          address: restaurant.address || '',
          city: restaurant.city || 'Unknown',
          country: restaurant.country,
          price_range: restaurant.price_range,
          michelin_stars: restaurant.michelin_stars,
          date_visited: restaurant.date_visited,
          created_at: restaurant.created_at,
          notes: restaurant.notes,
          photos: restaurant.photos || [],
          is_wishlist: restaurant.is_wishlist || false,
          friend: {
            id: friend?.friend_id || restaurant.user_id,
            username: friend?.username || 'Unknown',
            name: friend?.name || friend?.username || 'Unknown',
            avatar_url: friend?.avatar_url || ''
          }
        };
      });

      setFriendsRestaurants(formattedRestaurants);
    } catch (error) {
      console.error('Error in fallback fetch:', error);
    }
  };

  // Memoized filtering function for better performance
  const filterAndSortRestaurants = React.useCallback(() => {
    let filtered = [...friendsRestaurants];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.city.toLowerCase().includes(query) ||
        restaurant.friend.name.toLowerCase().includes(query) ||
        restaurant.friend.username.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterBy === 'rated') {
      filtered = filtered.filter(r => !r.is_wishlist && r.rating !== null);
    } else if (filterBy === 'wishlist') {
      filtered = filtered.filter(r => r.is_wishlist);
    }

    // Apply city filter
    if (selectedCity !== 'all') {
      filtered = filtered.filter(r => r.city === selectedCity);
    }

    // Apply cuisine filter
    if (selectedCuisines.length > 0) {
      filtered = filtered.filter(r =>
        selectedCuisines.includes(r.cuisine)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'rating':
          if (a.rating === null && b.rating === null) return 0;
          if (a.rating === null) return 1;
          if (b.rating === null) return -1;
          return (b.rating || 0) - (a.rating || 0);
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'friend':
          return a.friend.name.localeCompare(b.friend.name);
        default:
          return 0;
      }
    });

    setFilteredRestaurants(filtered);
  }, [friendsRestaurants, searchQuery, sortBy, filterBy, selectedCuisines, selectedCity]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Remove these functions since we're using memoized values
  // const getUniqueCuisines = () => { ... }
  // const getUniqueCities = () => { ... }

  const toggleCuisineFilter = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Loading friends' activity...</div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Friends' Activity
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Discover what your friends have been eating and their wishlist items all in one place
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rated</p>
                <p className="text-2xl font-bold">
                  {friendsRestaurants.filter(r => !r.is_wishlist && r.rating !== null).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Wishlist Items</p>
                <p className="text-2xl font-bold">
                  {friendsRestaurants.filter(r => r.is_wishlist).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Friends</p>
                <p className="text-2xl font-bold">
                  {new Set(friendsRestaurants.map(r => r.friend.id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Cities</p>
                <p className="text-2xl font-bold">
                  {new Set(friendsRestaurants.map(r => r.city)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-muted/50 p-1 rounded-lg">
          <Button
            variant={filterBy === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterBy('all')}
            className="flex items-center gap-2 px-4"
          >
            <List className="h-4 w-4" />
            All ({friendsRestaurants.length})
          </Button>
          <Button
            variant={filterBy === 'rated' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterBy('rated')}
            className="flex items-center gap-2 px-4"
          >
            <Star className="h-4 w-4" />
            Rated ({friendsRestaurants.filter(r => !r.is_wishlist && r.rating !== null).length})
          </Button>
          <Button
            variant={filterBy === 'wishlist' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterBy('wishlist')}
            className="flex items-center gap-2 px-4"
          >
            <Heart className="h-4 w-4" />
            Wishlist ({friendsRestaurants.filter(r => r.is_wishlist).length})
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Additional Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search restaurants, friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lg:col-span-2"
            />
            
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="friend">By Friend</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={(value: CityFilterOption) => setSelectedCity(value)}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Filter by city" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Cities</SelectItem>
                {uniqueCities.map(city => (
                  <SelectItem key={city} value={city}>
                    {city} ({friendsRestaurants.filter(r => r.city === city).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cuisine Dropdown Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filter by Cuisine:</p>
              {selectedCuisines.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCuisines([])}
                  className="text-xs"
                >
                  Clear Cuisines ({selectedCuisines.length})
                </Button>
              )}
            </div>
            
            <Select 
              value={selectedCuisines.length === 1 ? selectedCuisines[0] : selectedCuisines.length > 1 ? 'multiple' : 'none'} 
              onValueChange={(value) => {
                if (value === 'none') {
                  setSelectedCuisines([]);
                } else if (value !== 'multiple') {
                  setSelectedCuisines(prev => 
                    prev.includes(value) 
                      ? prev.filter(c => c !== value)
                      : [...prev, value]
                  );
                }
              }}
            >
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder={
                  selectedCuisines.length === 0 
                    ? "Select cuisines..." 
                    : selectedCuisines.length === 1 
                      ? selectedCuisines[0]
                      : `${selectedCuisines.length} cuisines selected`
                } />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50 max-h-60">
                <SelectItem value="none">All Cuisines</SelectItem>
                {uniqueCuisines.map(cuisine => (
                  <SelectItem 
                    key={cuisine} 
                    value={cuisine}
                    className={selectedCuisines.includes(cuisine) ? 'bg-primary/10' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{cuisine}</span>
                      <span className="text-muted-foreground ml-2">
                        ({friendsRestaurants.filter(r => r.cuisine === cuisine).length})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Cuisine Tags */}
            {selectedCuisines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedCuisines.map(cuisine => (
                  <Badge
                    key={cuisine}
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => setSelectedCuisines(prev => prev.filter(c => c !== cuisine))}
                  >
                    {cuisine} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Item' : 'Items'}
          </h2>
        </div>

        {filteredRestaurants.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activity Found</h3>
              <p className="text-muted-foreground">
                {friendsRestaurants.length === 0
                  ? "Your friends haven't added any restaurants yet."
                  : "No restaurants match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <Card key={restaurant.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header with friend info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={restaurant.friend.avatar_url} />
                          <AvatarFallback>
                            {restaurant.friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{restaurant.friend.name}</p>
                          <p className="text-xs text-muted-foreground">@{restaurant.friend.username}</p>
                        </div>
                      </div>
                      {restaurant.is_wishlist ? (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <Heart className="h-3 w-3 mr-1" />
                          Wishlist
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <Star className="h-3 w-3 mr-1" />
                          Rated
                        </Badge>
                      )}
                    </div>

                    {/* Restaurant info */}
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{restaurant.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{restaurant.cuisine}</p>
                      
                      {/* Rating */}
                      {restaurant.rating && !restaurant.is_wishlist && (
                        <div className="flex items-center gap-2 mb-2">
                          <StarRating rating={restaurant.rating} readonly size="sm" />
                          <span className="text-sm font-medium">{restaurant.rating}/10</span>
                        </div>
                      )}

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{restaurant.city}{restaurant.country && `, ${restaurant.country}`}</span>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 text-sm">
                        {restaurant.price_range && (
                          <PriceRange priceRange={restaurant.price_range} />
                        )}
                        {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                          <MichelinStars stars={restaurant.michelin_stars} />
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {restaurant.is_wishlist ? 'Added' : 'Visited'} {formatDate(restaurant.date_visited || restaurant.created_at)}
                        </span>
                      </div>

                      {/* Notes preview */}
                      {restaurant.notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          "{restaurant.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
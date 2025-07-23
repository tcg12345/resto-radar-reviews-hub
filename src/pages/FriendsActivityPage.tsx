import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFeedSkeleton } from '@/components/skeletons/ActivityFeedSkeleton';

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

// Global cache for friends activity data
const friendsActivityCache = new Map<string, {
  data: FriendRestaurant[];
  timestamp: number;
  userId: string;
}>();

// Cache for friends data to avoid refetching
const friendsDataCache = new Map<string, {
  data: any[];
  timestamp: number;
}>();

// Preload cache for next batches
const preloadCache = new Map<string, FriendRestaurant[]>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for faster refresh
const FRIENDS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for friends data

export function FriendsActivityPage() {
  const { user } = useAuth();
  const [friendsRestaurants, setFriendsRestaurants] = useState<FriendRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityFilterOption>('all');
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allFriendIds, setAllFriendIds] = useState<string[]>([]);
  const dataFetched = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Memoize expensive calculations
  const uniqueCuisines = React.useMemo(() => {
    const cuisines = friendsRestaurants.map(r => r.cuisine);
    return [...new Set(cuisines)].sort();
  }, [friendsRestaurants]);

  const uniqueCities = React.useMemo(() => {
    const cities = friendsRestaurants.map(r => r.city);
    return [...new Set(cities)].sort();
  }, [friendsRestaurants]);

  // Apply filters to current restaurants
  const filteredRestaurants = React.useMemo(() => {
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

    return filtered;
  }, [friendsRestaurants, searchQuery, sortBy, filterBy, selectedCuisines, selectedCity]);

  useEffect(() => {
    if (user && !dataFetched.current) {
      loadInitialData();
    }
  }, [user]);

  // Reset and reload when filters change (but not on initial load)
  useEffect(() => {
    if (dataFetched.current && user) {
      setFriendsRestaurants([]);
      setCurrentOffset(0);
      setHasMore(true);
      // Clear caches to prevent conflicts
      preloadCache.clear();
      loadInitialData();
    }
  }, [searchQuery, sortBy, filterBy, selectedCuisines, selectedCity]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMoreRestaurants();
        }
      },
      { threshold: 0.1 }
    );

    if (loadingTriggerRef.current) {
      observerRef.current.observe(loadingTriggerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, isLoading]);

  const getFriendsData = async () => {
    const cacheKey = `friends_${user?.id}`;
    const cached = friendsDataCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < FRIENDS_CACHE_DURATION) {
      return cached.data;
    }

    const { data: friendsData, error: friendsError } = await supabase
      .rpc('get_friends_with_scores', { requesting_user_id: user?.id });

    if (friendsError || !friendsData?.length) {
      return [];
    }

    // Cache the friends data
    friendsDataCache.set(cacheKey, {
      data: friendsData,
      timestamp: Date.now()
    });

    return friendsData;
  };

  const preloadNextBatch = async (friendIds: string[], friendsData: any[], nextOffset: number) => {
    try {
      const cacheKey = `preload_${user?.id}_${nextOffset}`;
      
      let query = supabase
        .from('restaurants')
        .select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, is_wishlist, user_id')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .range(nextOffset, nextOffset + ITEMS_PER_PAGE - 1);

      const { data: restaurantsData } = await query;
      
      if (restaurantsData?.length) {
        const friendsMap = new Map(friendsData.map(f => [f.friend_id, f]));
        const formattedRestaurants: FriendRestaurant[] = restaurantsData.map(restaurant => {
          const friend = friendsMap.get(restaurant.user_id);
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
            photos: [],  // Don't preload photos for performance
            is_wishlist: restaurant.is_wishlist || false,
            friend: {
              id: friend?.friend_id || restaurant.user_id,
              username: friend?.username || 'Unknown',
              name: friend?.name || friend?.username || 'Unknown',
              avatar_url: friend?.avatar_url || ''
            }
          };
        });
        
        preloadCache.set(cacheKey, formattedRestaurants);
      }
    } catch (error) {
      console.error('Error preloading next batch:', error);
    }
  };

  const loadInitialData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setCurrentOffset(0);
      
      // Get friends data with caching
      const friendsData = await getFriendsData();
      
      if (!friendsData.length) {
        setFriendsRestaurants([]);
        setHasMore(false);
        return;
      }

      const friendIds = friendsData.map(f => f.friend_id);
      setAllFriendIds(friendIds);

      // Load first batch of restaurants
      await loadRestaurantBatch(friendIds, friendsData, 0, true);
      
      // Preload next batch in background
      setTimeout(() => {
        preloadNextBatch(friendIds, friendsData, ITEMS_PER_PAGE);
      }, 100);
      
      dataFetched.current = true;
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast('Failed to load friends\' restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreRestaurants = async () => {
    if (isLoadingMore || !hasMore || allFriendIds.length === 0) return;
    
    setIsLoadingMore(true);
    
    try {
      const newOffset = currentOffset + ITEMS_PER_PAGE;
      const cacheKey = `preload_${user?.id}_${newOffset}`;
      
      // Check if we have preloaded data
      const preloadedData = preloadCache.get(cacheKey);
      
      if (preloadedData && preloadedData.length > 0) {
        // Use preloaded data for instant loading
        setFriendsRestaurants(prev => [...prev, ...preloadedData]);
        setCurrentOffset(newOffset);
        preloadCache.delete(cacheKey);
        
        // Check if we got fewer results than requested
        if (preloadedData.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        } else {
          // Preload next batch in background
          const friendsData = await getFriendsData();
          setTimeout(() => {
            preloadNextBatch(allFriendIds, friendsData, newOffset + ITEMS_PER_PAGE);
          }, 100);
        }
      } else {
        // Fallback to loading from database
        const friendsData = await getFriendsData();
        
        if (!friendsData.length) {
          setHasMore(false);
          return;
        }

        await loadRestaurantBatch(allFriendIds, friendsData, newOffset, false);
        setCurrentOffset(newOffset);
        
        // Preload next batch
        setTimeout(() => {
          preloadNextBatch(allFriendIds, friendsData, newOffset + ITEMS_PER_PAGE);
        }, 100);
      }
    } catch (error) {
      console.error('Error loading more restaurants:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadRestaurantBatch = async (
    friendIds: string[], 
    friendsData: any[], 
    offset: number, 
    isInitial: boolean
  ) => {
    // Exclude photos from initial query for better performance
    let query = supabase
      .from('restaurants')
      .select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, is_wishlist, user_id')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    // Apply filters to the database query for better performance
    if (filterBy === 'rated') {
      query = query.eq('is_wishlist', false).not('rating', 'is', null);
    } else if (filterBy === 'wishlist') {
      query = query.eq('is_wishlist', true);
    }

    if (selectedCuisines.length > 0) {
      query = query.in('cuisine', selectedCuisines);
    }

    const { data: restaurantsData, error: restaurantsError } = await query;

    if (restaurantsError) {
      console.error('Error fetching restaurants:', restaurantsError);
      return;
    }

    if (!restaurantsData || restaurantsData.length === 0) {
      setHasMore(false);
      return;
    }

    // Transform data with friend info (optimized)
    const friendsMap = new Map(friendsData.map(f => [f.friend_id, f]));
    const formattedRestaurants: FriendRestaurant[] = restaurantsData.map(restaurant => {
      const friend = friendsMap.get(restaurant.user_id);
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
        photos: [], // Exclude photos for performance
        is_wishlist: restaurant.is_wishlist || false,
        friend: {
          id: friend?.friend_id || restaurant.user_id,
          username: friend?.username || 'Unknown',
          name: friend?.name || friend?.username || 'Unknown',
          avatar_url: friend?.avatar_url || ''
        }
      };
    });

    if (isInitial) {
      setFriendsRestaurants(formattedRestaurants);
    } else {
      setFriendsRestaurants(prev => [...prev, ...formattedRestaurants]);
    }

    // Check if we got fewer results than requested
    if (restaurantsData.length < ITEMS_PER_PAGE) {
      setHasMore(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const toggleCuisineFilter = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  if (isLoading) {
    return (
      <div className="w-full p-6 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick filter buttons skeleton */}
        <div className="flex items-center justify-center">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg gap-1">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity feed skeleton */}
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <ActivityFeedSkeleton key={i} />
          ))}
        </div>
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
            {friendsRestaurants.length > 0 && hasMore && (
              <span className="text-sm text-muted-foreground ml-2">
                (loaded {friendsRestaurants.length} of many)
              </span>
            )}
          </h2>
        </div>

        {friendsRestaurants.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activity Found</h3>
              <p className="text-muted-foreground">
                {friendsRestaurants.length === 0 && !isLoading
                  ? "Your friends haven't added any restaurants yet."
                  : "No restaurants match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
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

            {/* Loading trigger and indicator */}
            {hasMore && (
              <div 
                ref={loadingTriggerRef}
                className="flex justify-center items-center py-8"
              >
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span>Loading more restaurants...</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Scroll down to load more
                  </div>
                )}
              </div>
            )}

            {!hasMore && friendsRestaurants.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>You've reached the end of the list!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
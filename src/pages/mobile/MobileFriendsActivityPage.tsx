import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Star, Heart, MapPin, Clock, Filter, SortAsc, List, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { StarRating } from '@/components/StarRating';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFeedSkeleton } from '@/components/skeletons/ActivityFeedSkeleton';
import { RestaurantActivityCardSkeleton } from '@/components/skeletons/RestaurantActivityCardSkeleton';

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

export function MobileFriendsActivityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL parameters
  const [friendsRestaurants, setFriendsRestaurants] = useState<FriendRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'recent');
  const [filterBy, setFilterBy] = useState<FilterOption>((searchParams.get('filter') as FilterOption) || 'all');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    searchParams.get('cuisines') ? searchParams.get('cuisines')!.split(',') : []
  );
  const [selectedCities, setSelectedCities] = useState<string[]>(
    searchParams.get('cities') ? searchParams.get('cities')!.split(',') : []
  );
  const [selectedFriends, setSelectedFriends] = useState<string[]>(
    searchParams.get('friends') ? searchParams.get('friends')!.split(',') : []
  );
  const [isCuisineDropdownOpen, setIsCuisineDropdownOpen] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isFriendsDropdownOpen, setIsFriendsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [hasMore, setHasMore] = useState(true);
  const [allFriendIds, setAllFriendIds] = useState<string[]>([]);
  const [allRestaurantsCache, setAllRestaurantsCache] = useState<FriendRestaurant[]>([]);
  const [restaurantMetadata, setRestaurantMetadata] = useState<{
    totalCount: number;
    ratedCount: number;
    wishlistCount: number;
    cities: Record<string, number>;
    cuisines: Record<string, number>;
  } | null>(null);
  const dataFetched = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const ITEMS_PER_PAGE = 18;

  // Load metadata for all restaurants to show accurate filter counts
  const loadRestaurantMetadata = async (friendIds: string[]) => {
    try {
      const { data: allRestaurants, error } = await supabase
        .from('restaurants')
        .select('id, cuisine, city, is_wishlist, rating')
        .in('user_id', friendIds);

      if (error || !allRestaurants) return null;

      const metadata = {
        totalCount: allRestaurants.length,
        ratedCount: allRestaurants.filter(r => !r.is_wishlist && r.rating !== null).length,
        wishlistCount: allRestaurants.filter(r => r.is_wishlist).length,
        cities: {} as Record<string, number>,
        cuisines: {} as Record<string, number>
      };

      // Count by city and cuisine
      allRestaurants.forEach(restaurant => {
        if (restaurant.city) {
          metadata.cities[restaurant.city] = (metadata.cities[restaurant.city] || 0) + 1;
        }
        if (restaurant.cuisine) {
          metadata.cuisines[restaurant.cuisine] = (metadata.cuisines[restaurant.cuisine] || 0) + 1;
        }
      });

      return metadata;
    } catch (error) {
      console.error('Error loading metadata:', error);
      return null;
    }
  };

  // Get filter counts from metadata or fallback to current data
  const getFilterCounts = () => {
    if (restaurantMetadata) {
      return {
        total: restaurantMetadata.totalCount,
        rated: restaurantMetadata.ratedCount,
        wishlist: restaurantMetadata.wishlistCount,
        cities: restaurantMetadata.cities,
        cuisines: restaurantMetadata.cuisines
      };
    }
    
    // Fallback to current loaded data
    const cities: Record<string, number> = {};
    const cuisines: Record<string, number> = {};
    
    friendsRestaurants.forEach(r => {
      cities[r.city] = (cities[r.city] || 0) + 1;
      cuisines[r.cuisine] = (cuisines[r.cuisine] || 0) + 1;
    });

    return {
      total: friendsRestaurants.length,
      rated: friendsRestaurants.filter(r => !r.is_wishlist && r.rating !== null).length,
      wishlist: friendsRestaurants.filter(r => r.is_wishlist).length,
      cities,
      cuisines
    };
  };

  const filterCounts = getFilterCounts();

  // Get unique values for filters from metadata
  const uniqueCuisines = React.useMemo(() => {
    if (restaurantMetadata) {
      return Object.keys(restaurantMetadata.cuisines).sort();
    }
    if (!friendsRestaurants || friendsRestaurants.length === 0) {
      return [];
    }
    return [...new Set(friendsRestaurants.map(r => r.cuisine))].sort();
  }, [restaurantMetadata, friendsRestaurants]);

  const uniqueCities = React.useMemo(() => {
    if (restaurantMetadata) {
      return Object.keys(restaurantMetadata.cities).sort();
    }
    if (!friendsRestaurants || friendsRestaurants.length === 0) {
      return [];
    }
    return [...new Set(friendsRestaurants.map(r => r.city))].sort();
  }, [restaurantMetadata, friendsRestaurants]);

  const uniqueFriends = React.useMemo(() => {
    if (!friendsRestaurants || friendsRestaurants.length === 0) {
      return [];
    }
    
    const friendsMap = new Map();
    friendsRestaurants.forEach(r => {
      if (!friendsMap.has(r.friend.id)) {
        friendsMap.set(r.friend.id, {
          id: r.friend.id,
          name: r.friend.name,
          username: r.friend.username,
          count: 1
        });
      } else {
        const friend = friendsMap.get(r.friend.id);
        friend.count += 1;
      }
    });
    return Array.from(friendsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [friendsRestaurants]);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 800);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Update URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('search', searchQuery);
    if (sortBy !== 'recent') params.set('sort', sortBy);
    if (filterBy !== 'all') params.set('filter', filterBy);
    if (selectedCuisines.length > 0) params.set('cuisines', selectedCuisines.join(','));
    if (selectedCities.length > 0) params.set('cities', selectedCities.join(','));
    if (selectedFriends.length > 0) params.set('friends', selectedFriends.join(','));
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    setSearchParams(params);
  }, [searchQuery, sortBy, filterBy, selectedCuisines, selectedCities, selectedFriends, currentPage, setSearchParams]);

  // Apply filters to current restaurants  
  const filteredRestaurants = React.useMemo(() => {
    let filtered = [...friendsRestaurants];

    // Apply search filter (use debounced query for actual filtering)
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(restaurant =>
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.city.toLowerCase().includes(query) ||
        restaurant.friend.name.toLowerCase().includes(query) ||
        restaurant.friend.username.toLowerCase().includes(query)
      );
    }

    // Apply city filter
    if (selectedCities.length > 0) {
      filtered = filtered.filter(r => selectedCities.includes(r.city));
    }

    // Apply friend filter
    if (selectedFriends.length > 0) {
      filtered = filtered.filter(r => selectedFriends.includes(r.friend.id));
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
  }, [friendsRestaurants, debouncedSearchQuery, sortBy, selectedCuisines, selectedCities, selectedFriends]);

  useEffect(() => {
    if (user && !dataFetched.current) {
      loadInitialData();
    }
  }, [user]);

  // Smart filtering - only reload when basic filters change (not search/cuisine/city/friends)
  useEffect(() => {
    if (dataFetched.current && user) {
      console.log('Basic filters changed, reloading data...', { filterBy });
      
      // Reset state for fresh load with filters
      setFriendsRestaurants([]);
      setCurrentPage(1);
      setHasMore(true);
      setIsLoadingMore(false);
      preloadCache.clear();
      
      // Load fresh data with current filters
      loadInitialData();
    }
  }, [filterBy]); // Only reload for filterBy changes (rated/wishlist/all)

  // Separate effect for sort changes that don't require reload
  useEffect(() => {
    // Sort changes don't require data reload, just re-sorting
  }, [sortBy, filterBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (dataFetched.current) {
      setCurrentPage(1);
      setHasMore(true);
      loadInitialData();
    }
  }, [debouncedSearchQuery, selectedCuisines, selectedCities, selectedFriends]); // Reset pagination when filters change

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
      
      // Get friends data with caching
      const friendsData = await getFriendsData();
      
      if (!friendsData.length) {
        setFriendsRestaurants([]);
        setHasMore(false);
        return;
      }

      const friendIds = friendsData.map(f => f.friend_id);
      setAllFriendIds(friendIds);

      // Load metadata for all restaurants to show accurate filter counts
      const metadata = await loadRestaurantMetadata(friendIds);
      if (metadata) {
        setRestaurantMetadata(metadata);
      }

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

  const loadNextPage = async () => {
    if (isLoadingMore || !hasMore || allFriendIds.length === 0) {
      return;
    }
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      const newOffset = (nextPage - 1) * ITEMS_PER_PAGE;
      
      const friendsData = await getFriendsData();
      
      if (!friendsData.length) {
        setHasMore(false);
        return;
      }

      // Load the next page and replace all restaurants (pagination behavior)
      await loadRestaurantBatch(allFriendIds, friendsData, newOffset, true);
      setCurrentPage(nextPage);
      
      // Force immediate scroll to top
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      
    } catch (error) {
      console.error('❌ Error loading next page:', error);
      toast.error('Failed to load next page');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadPreviousPage = async () => {
    if (isLoadingMore || currentPage <= 1 || allFriendIds.length === 0) {
      return;
    }
    
    setIsLoadingMore(true);
    
    try {
      const previousPage = currentPage - 1;
      const newOffset = (previousPage - 1) * ITEMS_PER_PAGE;
      
      const friendsData = await getFriendsData();
      
      if (!friendsData.length) {
        setHasMore(false);
        return;
      }

      // Load the previous page and replace all restaurants (pagination behavior)
      await loadRestaurantBatch(allFriendIds, friendsData, newOffset, true);
      setCurrentPage(previousPage);
      
      // Force immediate scroll to top
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
      
    } catch (error) {
      console.error('❌ Error loading previous page:', error);
      toast.error('Failed to load previous page');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const loadRestaurantBatch = async (friendIds: string[], friendsData: any[], offset: number, replace: boolean = false) => {
    if (isLoadingRef.current && !replace) {
      return;
    }

    const preloadKey = `preload_${user?.id}_${offset}`;
    const preloaded = preloadCache.get(preloadKey);
    
    let restaurantsData: any[] = [];
    
    if (preloaded) {
      restaurantsData = preloaded;
      preloadCache.delete(preloadKey);
    } else {
      try {
        isLoadingRef.current = true;
        
        let query = supabase
          .from('restaurants')
          .select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, is_wishlist, user_id, photos')
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .range(offset, offset + ITEMS_PER_PAGE - 1);

        // Apply filter at database level
        if (filterBy === 'rated') {
          query = query.eq('is_wishlist', false).not('rating', 'is', null);
        } else if (filterBy === 'wishlist') {
          query = query.eq('is_wishlist', true);
        }

        const { data: restaurants, error } = await query;

        if (error) {
          console.error('Database error loading restaurants:', error);
          return;
        }

        restaurantsData = restaurants || [];
      } catch (error) {
        console.error('Error loading restaurant batch:', error);
        return;
      } finally {
        isLoadingRef.current = false;
      }
    }

    if (!restaurantsData.length) {
      setHasMore(false);
      return;
    }

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

    if (replace) {
      setFriendsRestaurants(formattedRestaurants);
    } else {
      setFriendsRestaurants(prev => [...prev, ...formattedRestaurants]);
    }

    if (formattedRestaurants.length < ITEMS_PER_PAGE) {
      setHasMore(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSortBy('recent');
    setFilterBy('all');
    setSelectedCuisines([]);
    setSelectedCities([]);
    setSelectedFriends([]);
    setCurrentPage(1);
    setHasMore(true);
    
    // Load fresh data
    loadInitialData();
  };

  const handleRestaurantClick = (restaurant: FriendRestaurant) => {
    navigate(`/restaurants/${restaurant.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="w-64 h-8 bg-muted animate-pulse rounded"></div>
            <div className="w-96 h-6 bg-muted animate-pulse rounded"></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-3">
                  <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <ActivityFeedSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Please log in to view friends' activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Friends' Activity</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Discover what your friends have been eating and their wishlist items all in one place
          </p>
        </div>

        {/* Stats - Mobile optimized: all 4 in one row */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <Star className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Rated</p>
                <p className="text-lg font-bold">
                  {filterCounts.rated}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <Heart className="h-4 w-4 text-red-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Wishlist</p>
                <p className="text-lg font-bold">
                  {filterCounts.wishlist}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <MapPin className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Cities</p>
                <p className="text-lg font-bold">
                  {Object.keys(filterCounts.cities).length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3">
              <div className="text-center">
                <Clock className="h-4 w-4 text-green-500 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">
                  {filterCounts.total}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search restaurants, cuisines, cities, or friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4"
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                All ({filterCounts.total})
              </TabsTrigger>
              <TabsTrigger value="rated" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Rated ({filterCounts.rated})
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Wishlist ({filterCounts.wishlist})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort and Advanced Filters */}
          <div className="flex flex-col gap-3">
            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <SortAsc className="h-4 w-4" />
                  <SelectValue placeholder="Sort by" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="friend">By Friend</SelectItem>
              </SelectContent>
            </Select>

            {/* Advanced Filters */}
            <div className="space-y-3">
              {/* Cuisine Filter */}
              <Collapsible open={isCuisineDropdownOpen} onOpenChange={setIsCuisineDropdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Cuisines {selectedCuisines.length > 0 && `(${selectedCuisines.length})`}
                    </div>
                    {isCuisineDropdownOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded">
                    {uniqueCuisines.map((cuisine) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={selectedCuisines.includes(cuisine)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCuisines([...selectedCuisines, cuisine]);
                            } else {
                              setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                            }
                          }}
                        />
                        <label htmlFor={`cuisine-${cuisine}`} className="text-sm flex-1 cursor-pointer">
                          {cuisine} ({filterCounts.cuisines[cuisine] || 0})
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* City Filter */}
              <Collapsible open={isCityDropdownOpen} onOpenChange={setIsCityDropdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Cities {selectedCities.length > 0 && `(${selectedCities.length})`}
                    </div>
                    {isCityDropdownOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded">
                    {uniqueCities.map((city) => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox
                          id={`city-${city}`}
                          checked={selectedCities.includes(city)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCities([...selectedCities, city]);
                            } else {
                              setSelectedCities(selectedCities.filter(c => c !== city));
                            }
                          }}
                        />
                        <label htmlFor={`city-${city}`} className="text-sm flex-1 cursor-pointer">
                          {city} ({filterCounts.cities[city] || 0})
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Friends Filter */}
              <Collapsible open={isFriendsDropdownOpen} onOpenChange={setIsFriendsDropdownOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Friends {selectedFriends.length > 0 && `(${selectedFriends.length})`}
                    </div>
                    {isFriendsDropdownOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  <div className="max-h-48 overflow-y-auto space-y-2 p-2 border rounded">
                    {uniqueFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`friend-${friend.id}`}
                          checked={selectedFriends.includes(friend.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFriends([...selectedFriends, friend.id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(f => f !== friend.id));
                            }
                          }}
                        />
                        <label htmlFor={`friend-${friend.id}`} className="text-sm flex-1 cursor-pointer">
                          {friend.name} ({friend.count})
                        </label>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Clear Filters */}
            {(searchQuery || sortBy !== 'recent' || filterBy !== 'all' || selectedCuisines.length > 0 || selectedCities.length > 0 || selectedFriends.length > 0) && (
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No restaurants found</h3>
              <p className="text-muted-foreground">
                {searchQuery || selectedCuisines.length > 0 || selectedCities.length > 0 || selectedFriends.length > 0
                  ? "Try adjusting your filters or search terms"
                  : "Your friends haven't added any restaurants yet"}
              </p>
            </div>
          ) : (
            <>
              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
                </p>
                {hasMore && (
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage}
                  </p>
                )}
              </div>

              {/* Restaurant Cards */}
              <div className="grid gap-4">
                {filteredRestaurants.map((restaurant) => (
                  <Card 
                    key={restaurant.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleRestaurantClick(restaurant)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header with friend info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
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
                          <div className="flex items-center gap-2">
                            {restaurant.is_wishlist ? (
                              <Badge variant="secondary" className="text-xs">
                                <Heart className="h-3 w-3 mr-1" />
                                Wishlist
                              </Badge>
                            ) : (
                              restaurant.rating && (
                                <div className="flex items-center gap-1">
                                  <StarRating rating={restaurant.rating} size="sm" />
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Restaurant info */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg leading-tight">{restaurant.name}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span>{restaurant.cuisine}</span>
                                <span>•</span>
                                <span>{restaurant.city}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {restaurant.michelin_stars && (
                                <MichelinStars stars={restaurant.michelin_stars} size="sm" />
                              )}
                              {restaurant.price_range && (
                                <PriceRange priceRange={restaurant.price_range} size="sm" />
                              )}
                            </div>
                          </div>

                          {restaurant.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {restaurant.notes}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {restaurant.date_visited 
                                ? `Visited ${new Date(restaurant.date_visited).toLocaleDateString()}`
                                : `Added ${new Date(restaurant.created_at).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Mobile-Optimized Pagination */}
              {(hasMore || currentPage > 1) && (
                <div className="flex items-center justify-between pt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={loadPreviousPage}
                    disabled={currentPage <= 1 || isLoadingMore}
                    size="sm"
                    className="flex items-center gap-1 px-3 py-2 text-xs"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    <span className="hidden xs:inline">Previous</span>
                    <span className="xs:hidden">Prev</span>
                  </Button>
                  
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {currentPage}
                  </span>
                  
                  <Button
                    variant="outline"
                    onClick={loadNextPage}
                    disabled={!hasMore || isLoadingMore}
                    size="sm"
                    className="flex items-center gap-1 px-3 py-2 text-xs"
                  >
                    <span className="hidden xs:inline">Next</span>
                    <span className="xs:hidden">Next</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading...
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

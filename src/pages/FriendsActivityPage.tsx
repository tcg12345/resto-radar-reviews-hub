import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Star, Heart, MapPin, Clock, Filter, SortAsc, List, ChevronDown, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { FriendsFiltersDialog } from '@/components/FriendsFiltersDialog';
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

export function FriendsActivityPage() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL parameters
  const [friendsRestaurants, setFriendsRestaurants] = useState<FriendRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(searchParams.get('sort') as SortOption || 'recent');
  const [filterBy, setFilterBy] = useState<FilterOption>(searchParams.get('filter') as FilterOption || 'all');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(searchParams.get('cuisines') ? searchParams.get('cuisines')!.split(',') : []);
  const [selectedCities, setSelectedCities] = useState<string[]>(searchParams.get('cities') ? searchParams.get('cities')!.split(',') : []);
  const [selectedFriends, setSelectedFriends] = useState<string[]>(searchParams.get('friends') ? searchParams.get('friends')!.split(',') : []);
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
  
  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const dataFetched = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ITEMS_PER_PAGE = 18;

  // Load metadata for all restaurants to show accurate filter counts
  const loadRestaurantMetadata = async (friendIds: string[]) => {
    try {
      const {
        data: allRestaurants,
        error
      } = await supabase.from('restaurants').select('id, cuisine, city, is_wishlist, rating').in('user_id', friendIds);
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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      filtered = filtered.filter(restaurant => restaurant.name.toLowerCase().includes(query) || restaurant.cuisine.toLowerCase().includes(query) || restaurant.city.toLowerCase().includes(query) || restaurant.friend.name.toLowerCase().includes(query) || restaurant.friend.username.toLowerCase().includes(query));
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
      filtered = filtered.filter(r => selectedCuisines.includes(r.cuisine));
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
      console.log('Basic filters changed, reloading data...', {
        filterBy
      });

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
    if (cached && Date.now() - cached.timestamp < FRIENDS_CACHE_DURATION) {
      return cached.data;
    }
    const {
      data: friendsData,
      error: friendsError
    } = await supabase.rpc('get_friends_with_scores', {
      requesting_user_id: user?.id
    });
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
      let query = supabase.from('restaurants').select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, is_wishlist, user_id').in('user_id', friendIds).order('created_at', {
        ascending: false
      }).range(nextOffset, nextOffset + ITEMS_PER_PAGE - 1);
      const {
        data: restaurantsData
      } = await query;
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
            photos: [],
            // Don't preload photos for performance
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
      const prevPage = currentPage - 1;
      const newOffset = (prevPage - 1) * ITEMS_PER_PAGE;
      const friendsData = await getFriendsData();
      if (!friendsData.length) {
        return;
      }

      // Load the previous page and replace all restaurants
      await loadRestaurantBatch(allFriendIds, friendsData, newOffset, true);
      setCurrentPage(prevPage);

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
  const loadRestaurantBatch = async (friendIds: string[], friendsData: any[], offset: number, isInitial: boolean) => {
    // Build the query with all active filters applied at database level
    let query = supabase.from('restaurants').select('id, name, cuisine, rating, address, city, country, price_range, michelin_stars, date_visited, created_at, notes, is_wishlist, user_id').in('user_id', friendIds).order('created_at', {
      ascending: false
    });

    // Apply basic filter (rated/wishlist/all)
    if (filterBy === 'rated') {
      query = query.eq('is_wishlist', false).not('rating', 'is', null);
    } else if (filterBy === 'wishlist') {
      query = query.eq('is_wishlist', true);
    }

    // Apply search filter at database level
    if (debouncedSearchQuery) {
      const searchTerm = `%${debouncedSearchQuery.toLowerCase()}%`;
      query = query.or(`name.ilike.${searchTerm},cuisine.ilike.${searchTerm},city.ilike.${searchTerm}`);
    }

    // Apply city filter at database level
    if (selectedCities.length > 0) {
      query = query.in('city', selectedCities);
    }

    // Apply cuisine filter at database level
    if (selectedCuisines.length > 0) {
      query = query.in('cuisine', selectedCuisines);
    }

    // Apply friend filter at database level
    if (selectedFriends.length > 0) {
      query = query.in('user_id', selectedFriends);
    }

    // Apply pagination
    query = query.range(offset, offset + ITEMS_PER_PAGE - 1);
    const {
      data: restaurantsData,
      error: restaurantsError
    } = await query;
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
        photos: [],
        // Exclude photos for performance
        is_wishlist: restaurant.is_wishlist || false,
        friend: {
          id: friend?.friend_id || restaurant.user_id,
          username: friend?.username || 'Unknown',
          name: friend?.name || friend?.username || 'Unknown',
          avatar_url: friend?.avatar_url || ''
        }
      };
    });

    // Always replace restaurants for pagination (not append)
    setFriendsRestaurants(formattedRestaurants);

    // Check if we got fewer results than requested
    console.log(`Restaurant batch loaded: ${restaurantsData.length} restaurants, offset: ${offset}, isInitial: ${isInitial}`);
    if (restaurantsData.length < ITEMS_PER_PAGE) {
      console.log(`Got ${restaurantsData.length} restaurants (< ${ITEMS_PER_PAGE}), setting hasMore to false`);
      setHasMore(false);
    } else {
      console.log(`Got ${restaurantsData.length} restaurants, more may be available`);
      // Keep hasMore true if we got a full batch
      setHasMore(true);
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
    setSelectedCuisines(prev => prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]);
  };
  if (isLoading) {
    return <div className="w-full p-6 space-y-6">
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
          {[...Array(4)].map((_, i) => <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {/* Quick filter buttons skeleton */}
        <div className="flex items-center justify-center">
          <div className="flex items-center bg-muted/50 p-1 rounded-lg gap-1">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-20" />)}
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
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </CardContent>
        </Card>

        {/* Activity feed skeleton */}
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => <ActivityFeedSkeleton key={i} />)}
        </div>
      </div>;
  }
  return (
    <div className="w-full">
      <div className="p-6 space-y-6">
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
      <Card className="md:hidden">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Total Rated</p>
                <p className="text-lg font-bold">{filterCounts.rated}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Wishlist Items</p>
                <p className="text-lg font-bold">{filterCounts.wishlist}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Active Friends</p>
                <p className="text-lg font-bold">{new Set(friendsRestaurants.map(r => r.friend.id)).size}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Cities</p>
                <p className="text-lg font-bold">{new Set(friendsRestaurants.map(r => r.city)).size}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="hidden md:grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Rated</p>
                <p className="text-2xl font-bold">
                  {filterCounts.rated}
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
                  {filterCounts.wishlist}
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
          <Button variant={filterBy === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterBy('all')} className="flex items-center gap-2 px-4">
            <List className="h-4 w-4" />
            All ({filterCounts.total})
          </Button>
          <Button variant={filterBy === 'rated' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterBy('rated')} className="flex items-center gap-2 px-4">
            <Star className="h-4 w-4" />
            Rated ({filterCounts.rated})
          </Button>
          <Button variant={filterBy === 'wishlist' ? 'default' : 'ghost'} size="sm" onClick={() => setFilterBy('wishlist')} className="flex items-center gap-2 px-4">
            <Heart className="h-4 w-4" />
            Wishlist ({filterCounts.wishlist})
          </Button>
        </div>
      </div>

      {/* Mobile-Optimized Search and Filters */}
      <div className="block md:hidden space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search restaurants, friends..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
          if (e.key === 'Enter') {
            if (searchTimeoutRef.current) {
              clearTimeout(searchTimeoutRef.current);
            }
            setDebouncedSearchQuery(searchQuery);
          }
        }} className="pl-10 h-12 text-base" />
        </div>

        {/* Filters and Sort Row */}
        <div className="flex gap-3">
          {/* Mobile Filters Button */}
          {isMobile ? (
            <Button 
              variant="outline" 
              className="flex-1 h-12 flex items-center justify-between"
              onClick={() => setShowMobileFilters(true)}
            >
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {selectedCuisines.length + selectedCities.length + selectedFriends.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-2 text-xs">
                    {selectedCuisines.length + selectedCities.length + selectedFriends.length}
                  </Badge>
                )}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          ) : (
            /* Desktop Filters Dropdown */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 h-12 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {selectedCuisines.length + selectedCities.length + selectedFriends.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-2 text-xs">
                        {selectedCuisines.length + selectedCities.length + selectedFriends.length}
                      </Badge>}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                {/* Friends Filter Sub-Dropdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center justify-between">
                    <span>Friends</span>
                    {selectedFriends.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                        {selectedFriends.length}
                      </Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 max-h-64 overflow-y-auto [&[data-side=right]]:translate-x-[-100%] [&[data-side=right]]:left-0">
                    {uniqueFriends.map(friend => <DropdownMenuCheckboxItem key={friend.id} checked={selectedFriends.includes(friend.id)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedFriends(prev => [...prev, friend.id]);
                    } else {
                      setSelectedFriends(prev => prev.filter(f => f !== friend.id));
                    }
                  }}>
                        {friend.name} ({friend.count})
                      </DropdownMenuCheckboxItem>)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* City Filter Sub-Dropdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center justify-between">
                    <span>Cities</span>
                    {selectedCities.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                        {selectedCities.length}
                      </Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 max-h-64 overflow-y-auto [&[data-side=right]]:translate-x-[-100%] [&[data-side=right]]:left-0">
                    {uniqueCities.map(city => <DropdownMenuCheckboxItem key={city} checked={selectedCities.includes(city)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedCities(prev => [...prev, city]);
                    } else {
                      setSelectedCities(prev => prev.filter(c => c !== city));
                    }
                  }}>
                        {city} ({filterCounts.cities[city] || 0})
                      </DropdownMenuCheckboxItem>)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* Cuisine Filter Sub-Dropdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center justify-between">
                    <span>Cuisines</span>
                    {selectedCuisines.length > 0 && <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-xs">
                        {selectedCuisines.length}
                      </Badge>}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 max-h-64 overflow-y-auto [&[data-side=right]]:translate-x-[-100%] [&[data-side=right]]:left-0">
                    {uniqueCuisines.map(cuisine => <DropdownMenuCheckboxItem key={cuisine} checked={selectedCuisines.includes(cuisine)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedCuisines(prev => [...prev, cuisine]);
                    } else {
                      setSelectedCuisines(prev => prev.filter(c => c !== cuisine));
                    }
                  }}>
                        {cuisine} ({filterCounts.cuisines[cuisine] || 0})
                      </DropdownMenuCheckboxItem>)}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32 h-12 bg-background border-border">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="friend">Friend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filters Dialog */}
        <FriendsFiltersDialog
          open={showMobileFilters}
          onOpenChange={setShowMobileFilters}
          uniqueFriends={uniqueFriends}
          uniqueCities={uniqueCities}
          uniqueCuisines={uniqueCuisines}
          selectedFriends={selectedFriends}
          selectedCities={selectedCities}
          selectedCuisines={selectedCuisines}
          onFriendsChange={setSelectedFriends}
          onCitiesChange={setSelectedCities}
          onCuisinesChange={setSelectedCuisines}
          filterCounts={filterCounts}
        />

        {/* Selected Filter Tags */}
        {(selectedFriends.length > 0 || selectedCities.length > 0 || selectedCuisines.length > 0) && <div className="flex flex-wrap gap-2">
            {selectedFriends.map(friendId => {
          const friend = uniqueFriends.find(f => f.id === friendId);
          return <Badge key={`friend-${friendId}`} variant="default" className="cursor-pointer hover:bg-primary/80 text-xs h-6 px-2" onClick={() => setSelectedFriends(prev => prev.filter(f => f !== friendId))}>
                  {friend?.name} ×
                </Badge>;
        })}
            
            {selectedCities.map(city => <Badge key={`city-${city}`} variant="default" className="cursor-pointer hover:bg-primary/80 text-xs h-6 px-2" onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}>
                {city} ×
              </Badge>)}
            
            {selectedCuisines.map(cuisine => <Badge key={`cuisine-${cuisine}`} variant="default" className="cursor-pointer hover:bg-primary/80 text-xs h-6 px-2" onClick={() => setSelectedCuisines(prev => prev.filter(c => c !== cuisine))}>
                {cuisine} ×
              </Badge>)}
          </div>}

        {/* Clear All Filters Button */}
        {(selectedCuisines.length > 0 || selectedCities.length > 0 || selectedFriends.length > 0 || debouncedSearchQuery) && <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => {
          setSelectedCuisines([]);
          setSelectedCities([]);
          setSelectedFriends([]);
          setSearchQuery('');
          setDebouncedSearchQuery('');
        }} className="text-xs">
              Clear All Filters
            </Button>
          </div>}
      </div>

      {/* Desktop Filters (Hidden on Mobile) */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Additional Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input placeholder="Search restaurants, friends..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => {
            if (e.key === 'Enter') {
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
              setDebouncedSearchQuery(searchQuery);
            }
          }} className="lg:col-span-2" />
            
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
          </div>

          {/* Clear All Filters Button */}
          {(selectedCuisines.length > 0 || selectedCities.length > 0 || selectedFriends.length > 0 || debouncedSearchQuery) && <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => {
            setSelectedCuisines([]);
            setSelectedCities([]);
            setSelectedFriends([]);
            setSearchQuery('');
            setDebouncedSearchQuery('');
          }} className="text-xs">
                Clear All Filters
              </Button>
            </div>}

          {/* Filter Row - Friends, City, and Cuisine in horizontal layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Friends Dropdown Filter */}
            <Collapsible open={isFriendsDropdownOpen} onOpenChange={setIsFriendsDropdownOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background border-border">
                  <span className="text-sm font-medium">
                    Filter by Friend
                    {selectedFriends.length > 0 && <span className="ml-2 text-primary">
                        ({selectedFriends.length} selected)
                      </span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isFriendsDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md bg-background">
                  {uniqueFriends.map(friend => <div key={friend.id} className="flex items-center space-x-2">
                      <Checkbox id={`friend-${friend.id}`} checked={selectedFriends.includes(friend.id)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedFriends(prev => [...prev, friend.id]);
                    } else {
                      setSelectedFriends(prev => prev.filter(f => f !== friend.id));
                    }
                  }} />
                      <label htmlFor={`friend-${friend.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {friend.name} ({friend.count})
                      </label>
                    </div>)}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* City Dropdown Filter */}
            <Collapsible open={isCityDropdownOpen} onOpenChange={setIsCityDropdownOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background border-border">
                  <span className="text-sm font-medium">
                    Filter by City
                    {selectedCities.length > 0 && <span className="ml-2 text-primary">
                        ({selectedCities.length} selected)
                      </span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md bg-background">
                  {uniqueCities.map(city => <div key={city} className="flex items-center space-x-2">
                      <Checkbox id={`city-${city}`} checked={selectedCities.includes(city)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedCities(prev => [...prev, city]);
                    } else {
                      setSelectedCities(prev => prev.filter(c => c !== city));
                    }
                  }} />
                      <label htmlFor={`city-${city}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {city} ({filterCounts.cities[city] || 0})
                      </label>
                    </div>)}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Cuisine Dropdown Filter */}
            <Collapsible open={isCuisineDropdownOpen} onOpenChange={setIsCuisineDropdownOpen} className="space-y-2">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background border-border">
                  <span className="text-sm font-medium">
                    Filter by Cuisine
                    {selectedCuisines.length > 0 && <span className="ml-2 text-primary">
                        ({selectedCuisines.length} selected)
                      </span>}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCuisineDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-2 border rounded-md bg-background">
                  {uniqueCuisines.map(cuisine => <div key={cuisine} className="flex items-center space-x-2">
                      <Checkbox id={`cuisine-${cuisine}`} checked={selectedCuisines.includes(cuisine)} onCheckedChange={checked => {
                    if (checked) {
                      setSelectedCuisines(prev => [...prev, cuisine]);
                    } else {
                      setSelectedCuisines(prev => prev.filter(c => c !== cuisine));
                    }
                  }} />
                      <label htmlFor={`cuisine-${cuisine}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {cuisine} ({filterCounts.cuisines[cuisine] || 0})
                      </label>
                    </div>)}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* All Selected Tags Combined */}
          {(selectedFriends.length > 0 || selectedCities.length > 0 || selectedCuisines.length > 0) && <div className="flex flex-wrap gap-2 mt-4">
              {/* Selected Friends Tags */}
              {selectedFriends.map(friendId => {
            const friend = uniqueFriends.find(f => f.id === friendId);
            return <Badge key={`friend-${friendId}`} variant="default" className="cursor-pointer hover:bg-primary/80" onClick={() => setSelectedFriends(prev => prev.filter(f => f !== friendId))}>
                    {friend?.name} ×
                  </Badge>;
          })}
              
              {/* Selected City Tags */}
              {selectedCities.map(city => <Badge key={`city-${city}`} variant="default" className="cursor-pointer hover:bg-primary/80" onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}>
                  {city} ×
                </Badge>)}
              
              {/* Selected Cuisine Tags */}
              {selectedCuisines.map(cuisine => <Badge key={`cuisine-${cuisine}`} variant="default" className="cursor-pointer hover:bg-primary/80" onClick={() => setSelectedCuisines(prev => prev.filter(c => c !== cuisine))}>
                  {cuisine} ×
                </Badge>)}
            </div>}
        </CardContent>
      </Card>
      </div>

      {/* Activity Feed Section - Outside padding for edge-to-edge cards */}
      <div className="space-y-6">
        {/* Results Header */}
        <div className="px-6">
          <h2 className="text-xl font-semibold">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'Item' : 'Items'}
            {friendsRestaurants.length > 0 && hasMore && <span className="text-sm text-muted-foreground ml-2">
                (loaded {friendsRestaurants.length} of many)
              </span>}
          </h2>
        </div>

        {friendsRestaurants.length === 0 && !isLoading ? (
          <div className="px-6">
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Activity Found</h3>
                <p className="text-muted-foreground">
                  {friendsRestaurants.length === 0 && !isLoading ? "Your friends haven't added any restaurants yet." : "No restaurants match your current filters."}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {filteredRestaurants.map(restaurant => <div key={restaurant.id} className="border-t border-b border-border hover:bg-accent/50 transition-colors cursor-pointer p-4" onClick={() => {
            // Preserve current search parameters for when user returns
            const currentSearch = searchParams.toString();
            const returnUrl = currentSearch ? `/search/friends?${currentSearch}` : '/search/friends';
            navigate(`/restaurant/${restaurant.id}?friendId=${restaurant.friend.id}&fromFriendsActivity=true&returnUrl=${encodeURIComponent(returnUrl)}`);
          }}>
                  {/* Mobile Layout - Optimized for small screens */}
                  <div className="md:hidden space-y-3">
                    {/* Friend Info Header - Compact */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={restaurant.friend.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {restaurant.friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs truncate">{restaurant.friend.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs px-2 py-0.5 flex-shrink-0 ${restaurant.is_wishlist ? 'text-red-600 border-red-200' : 'text-green-600 border-green-200'}`}>
                        {restaurant.is_wishlist ? <><Heart className="h-2.5 w-2.5 mr-1" />Want</> : <><Star className="h-2.5 w-2.5 mr-1" />Been</>}
                      </Badge>
                    </div>

                    {/* Restaurant Name & Basic Info */}
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-1">{restaurant.name}</h3>
                         {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                           <MichelinStars stars={restaurant.michelin_stars} size="sm" readonly showLogo={false} />
                         )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="truncate">{restaurant.cuisine}</span>
                        <span>•</span>
                        <span className="truncate">{restaurant.city}</span>
                      </div>
                    </div>

                    {/* Rating & Details Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {restaurant.rating && !restaurant.is_wishlist && <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{restaurant.rating}</span>
                          </div>}
                        {restaurant.price_range && <span className="text-xs text-green-600 font-medium">
                            {'$'.repeat(restaurant.price_range)}
                          </span>}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(restaurant.date_visited || restaurant.created_at)}</span>
                      </div>
                    </div>

                    {/* Notes Preview - Mobile Only */}
                    {restaurant.notes && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        "{restaurant.notes}"
                      </p>}
                  </div>

                  {/* Desktop Layout - Unchanged */}
                  <div className="hidden md:block space-y-4">
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
                      {restaurant.is_wishlist ? <Badge variant="outline" className="text-red-600 border-red-200">
                          <Heart className="h-3 w-3 mr-1" />
                          Wishlist
                        </Badge> : <Badge variant="outline" className="text-green-600 border-green-200">
                          <Star className="h-3 w-3 mr-1" />
                          Rated
                        </Badge>}
                    </div>

                    {/* Restaurant info */}
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                         {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                           <MichelinStars stars={restaurant.michelin_stars} size="sm" readonly showLogo={false} />
                         )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{restaurant.cuisine}</p>
                      
                      {/* Rating */}
                      {restaurant.rating && !restaurant.is_wishlist && <div className="flex items-center gap-2 mb-2">
                          <StarRating rating={restaurant.rating} readonly size="sm" />
                          
                        </div>}

                      {/* Location */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        <span>{restaurant.city}{restaurant.country && `, ${restaurant.country}`}</span>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 text-sm">
                        {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {restaurant.is_wishlist ? 'Added' : 'Visited'} {formatDate(restaurant.date_visited || restaurant.created_at)}
                        </span>
                      </div>

                      {/* Notes preview */}
                      {restaurant.notes && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          "{restaurant.notes}"
                        </p>}
                    </div>
                  </div>
                </div>)}

            {/* Skeleton cards for loading more - show immediately when loading starts */}
            {isLoadingMore && (
              <>
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <RestaurantActivityCardSkeleton key={`skeleton-loading-${index}`} />
                ))}
              </>
            )}
            </div>

            {/* Pagination Controls */}
            <div className="px-6">
              <div className="flex justify-center items-center gap-4 pt-8">
                {/* Previous Page Button */}
                {currentPage > 1 && (
                  <Button onClick={loadPreviousPage} disabled={isLoadingMore} size="lg" variant="outline" className="min-w-32 flex items-center gap-2">
                    {isLoadingMore ? 'Loading...' : (
                      <>
                        <ChevronLeft className="h-4 w-4" />
                        Previous Page ({currentPage - 1})
                      </>
                    )}
                  </Button>
                )}

                {/* Page indicator */}
                {(currentPage > 1 || hasMore) && (
                  <div className="text-sm text-muted-foreground font-medium px-4">
                    Page {currentPage}
                  </div>
                )}

                {/* Next Page Button */}
                {hasMore && (
                  <Button onClick={loadNextPage} disabled={isLoadingMore} size="lg" className="min-w-32 flex items-center gap-2">
                    {isLoadingMore ? 'Loading...' : (
                      <>
                        Next Page ({currentPage + 1})
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
                
                {/* End message */}
                {!hasMore && friendsRestaurants.length > 0 && (
                  <div className="text-center text-muted-foreground">
                    <p>You've reached the end of the list!</p>
                    <p className="text-sm mt-1">Page {currentPage} • {filteredRestaurants.length} restaurants shown</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
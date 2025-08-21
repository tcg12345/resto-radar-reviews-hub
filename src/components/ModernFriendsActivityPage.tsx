import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Star, Heart, MapPin, Clock, Filter, Search, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export function ModernFriendsActivityPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [friendsRestaurants, setFriendsRestaurants] = useState<FriendRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(searchParams.get('sort') as SortOption || 'recent');
  const [filterBy, setFilterBy] = useState<FilterOption>(searchParams.get('filter') as FilterOption || 'all');

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
    });
  };

  // Debounce search query
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Load data
  useEffect(() => {
    if (user) {
      loadFriendsActivity();
    }
  }, [user, filterBy]);

  const loadFriendsActivity = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get friends
      const { data: friendsData, error: friendsError } = await supabase
        .rpc('get_friends_with_scores', { requesting_user_id: user.id });
      
      if (friendsError || !friendsData?.length) {
        setFriendsRestaurants([]);
        return;
      }

      const friendIds = friendsData.map(f => f.friend_id);
      
      // Build query based on filter
      let query = supabase
        .from('restaurants')
        .select('*')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false });

      if (filterBy === 'rated') {
        query = query.eq('is_wishlist', false).not('rating', 'is', null);
      } else if (filterBy === 'wishlist') {
        query = query.eq('is_wishlist', true);
      }

      const { data: restaurantsData, error: restaurantsError } = await query;
      
      if (restaurantsError) throw restaurantsError;

      // Format data
      const friendsMap = new Map(friendsData.map(f => [f.friend_id, f]));
      const formattedRestaurants: FriendRestaurant[] = (restaurantsData || []).map(restaurant => {
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
      console.error('Error loading friends activity:', error);
      toast.error('Failed to load friends activity');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    let filtered = [...friendsRestaurants];

    // Search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query) ||
        restaurant.city.toLowerCase().includes(query) ||
        restaurant.friend.name.toLowerCase().includes(query)
      );
    }

    // Sort
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
  }, [friendsRestaurants, debouncedSearchQuery, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueFriends = new Set(friendsRestaurants.map(r => r.friend.id));
    const uniqueCities = new Set(friendsRestaurants.map(r => r.city));
    const ratedCount = friendsRestaurants.filter(r => !r.is_wishlist && r.rating !== null).length;
    const wishlistCount = friendsRestaurants.filter(r => r.is_wishlist).length;
    
    return {
      friends: uniqueFriends.size,
      cities: uniqueCities.size,
      rated: ratedCount,
      wishlist: wishlistCount,
      total: friendsRestaurants.length
    };
  }, [friendsRestaurants]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-8 max-w-4xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8 max-w-4xl">
      {/* Modern Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50">
          <div className="p-2 rounded-xl bg-blue-500/10">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">Friends</p>
            <p className="text-2xl font-bold text-blue-900">{stats.friends}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/50">
          <div className="p-2 rounded-xl bg-yellow-500/10">
            <Star className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-900">Rated</p>
            <p className="text-2xl font-bold text-yellow-900">{stats.rated}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50">
          <div className="p-2 rounded-xl bg-red-500/10">
            <Heart className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">Wishlist</p>
            <p className="text-2xl font-bold text-red-900">{stats.wishlist}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/50">
          <div className="p-2 rounded-xl bg-green-500/10">
            <MapPin className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">Cities</p>
            <p className="text-2xl font-bold text-green-900">{stats.cities}</p>
          </div>
        </div>
      </div>

      {/* Modern Filter Tabs */}
      <div className="flex justify-between items-center">
        <Tabs value={filterBy} onValueChange={(value) => setFilterBy(value as FilterOption)}>
          <TabsList className="h-12 p-1 bg-muted/30 rounded-2xl border-0">
            <TabsTrigger 
              value="all" 
              className="h-10 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
            >
              All
              <Badge variant="secondary" className="ml-3 h-6 px-3 text-xs rounded-full bg-background/50 text-foreground/70">
                {stats.total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="rated" 
              className="h-10 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
            >
              Rated
              <Badge variant="secondary" className="ml-3 h-6 px-3 text-xs rounded-full bg-background/50 text-foreground/70">
                {stats.rated}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="wishlist" 
              className="h-10 px-6 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm font-medium"
            >
              Wishlist
              <Badge variant="secondary" className="ml-3 h-6 px-3 text-xs rounded-full bg-background/50 text-foreground/70">
                {stats.wishlist}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Compact Search & Sort Controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-md">
            <Input 
              placeholder="Search restaurants, friends..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="h-11 rounded-xl border-border bg-background/50 focus:bg-background transition-colors" 
            />
          </div>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-44 h-11 rounded-xl border-border bg-background/50 hover:bg-background transition-colors">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border">
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="friend">By Friend</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Feed Section */}
      <div className="space-y-6">
        {/* Results Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">
            Recent Activity
          </h2>
          <div className="text-sm text-muted-foreground">
            {filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'result' : 'results'}
          </div>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-muted/30 rounded-full flex items-center justify-center mb-6">
              <Users className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Activity Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {friendsRestaurants.length === 0 
                ? "Your friends haven't added any restaurants yet. Invite them to join!" 
                : "No restaurants match your current filters."}
            </p>
          </div>
        ) : (
          /* Full-Width Modern Activity Cards */
          <div className="space-y-4">
            {filteredRestaurants.map(restaurant => (
              <div 
                key={restaurant.id} 
                className="group cursor-pointer rounded-2xl border border-border bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                onClick={() => {
                  const currentSearch = searchParams.toString();
                  const returnUrl = currentSearch ? `/search/friends?${currentSearch}` : '/search/friends';
                  navigate(`/restaurant/${restaurant.id}?friendId=${restaurant.friend.id}&fromFriendsActivity=true&returnUrl=${encodeURIComponent(returnUrl)}`);
                }}
              >
                <div className="p-6 space-y-4">
                  {/* Top Row: Friend Info + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-background">
                        <AvatarImage src={restaurant.friend.avatar_url} />
                        <AvatarFallback className="text-sm font-medium bg-muted">
                          {restaurant.friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-muted-foreground">{restaurant.friend.name}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`px-4 py-1.5 rounded-full font-medium border-2 transition-colors ${
                        restaurant.is_wishlist 
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      {restaurant.is_wishlist ? 'Want to Try' : 'Been There'}
                    </Badge>
                  </div>

                  {/* Restaurant Name Row + Rating */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                          {restaurant.name}
                        </h3>
                        {restaurant.michelin_stars && restaurant.michelin_stars > 0 && (
                          <div className="flex items-center">
                            {Array.from({ length: restaurant.michelin_stars }).map((_, i) => (
                              <span key={i} className="text-lg">⭐</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {restaurant.rating && !restaurant.is_wishlist && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-200">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold text-yellow-900">{restaurant.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Details Row: Cuisine • City • Price */}
                  <div className="flex items-center gap-3 text-base">
                    <span className="text-muted-foreground">{restaurant.cuisine}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">{restaurant.city}</span>
                    {restaurant.price_range && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="font-bold text-green-600">
                          {'$'.repeat(restaurant.price_range)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bottom Row: Date */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {restaurant.is_wishlist ? 'Added to wishlist' : 'Visited'} on {formatDate(restaurant.date_visited || restaurant.created_at)}
                    </span>
                  </div>

                  {/* Notes Preview */}
                  {restaurant.notes && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-2">
                        "{restaurant.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
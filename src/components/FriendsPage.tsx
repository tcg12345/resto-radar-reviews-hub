import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Users, 
  Clock, 
  Send, 
  Star, 
  MapPin, 
  Calendar, 
  Eye, 
  Phone,
  Activity,
  Settings2,
  User,
  Check,
  X,
  ArrowLeft,
  TrendingUp,
  Award,
  Target,
  ChefHat,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  Heart,
  Share2,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useAuth } from '@/contexts/AuthContext';
import { StarRating } from '@/components/StarRating';
import { MichelinStars } from '@/components/MichelinStars';
import { PriceRange } from '@/components/PriceRange';
import { ContactPermission } from '@/components/ContactPermission';
import { FriendProfilePopup } from '@/components/FriendProfilePopup';
import { FriendCardSkeleton } from '@/components/skeletons/FriendCardSkeleton';
import { FriendProfileSkeleton } from '@/components/skeletons/FriendProfileSkeleton';
import { ActivityFeedSkeleton } from '@/components/skeletons/ActivityFeedSkeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  username: string;
  name: string | null;
  avatar_url: string | null;
  is_public: boolean;
}

interface FriendProfileModalProps {
  friend: any;
  isOpen: boolean;
  onClose: () => void;
}

function FriendProfileModal({ friend, isOpen, onClose }: FriendProfileModalProps) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedRestaurants, setDisplayedRestaurants] = useState(1000); // Show all restaurants by default
  const [displayedWishlist, setDisplayedWishlist] = useState(1000); // Show all wishlist items by default

  useEffect(() => {
    if (isOpen && friend) {
      loadFriendData();
    }
  }, [isOpen, friend]);

  const loadFriendData = async () => {
    if (!friend) return;
    
    setIsLoading(true);
    // Don't reset display limits - show all restaurants loaded from database
    
    try {
      // Use direct database call for much faster loading
      const { data: userData } = await supabase.auth.getUser();
      const { data: profileData, error } = await supabase
        .rpc('get_friend_profile_data', {
          target_user_id: friend.id,
          requesting_user_id: userData.user?.id || '',
          restaurant_limit: 1000 // Load all restaurants, no artificial limit
        })
        .single();

      if (error) {
        console.error('Error fetching profile data:', error);
        setIsLoading(false);
        return;
      }

      if (!profileData.can_view) {
        console.log('Cannot view this friend\'s profile');
        setIsLoading(false);
        return;
      }

      // Transform recent_restaurants into proper restaurant format
      const restaurants = Array.isArray(profileData.recent_restaurants) ? profileData.recent_restaurants : [];
      const wishlistItems: any[] = []; // Will load separately if needed
      
      setRestaurants(restaurants);
      setWishlist(wishlistItems);
    } catch (error) {
      console.error('Error loading friend data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!friend) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={friend.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {friend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold">@{friend.username}</DialogTitle>
              {friend.name && (
                <p className="text-lg text-muted-foreground">{friend.name}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={friend.is_public ? "default" : "secondary"} className="text-sm">
                  {friend.is_public ? 'Public Profile' : 'Private Profile'}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  <Star className="h-3 w-3 mr-1" />
                  Score: {friend.score}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {isLoading ? (
          <FriendProfileSkeleton />
        ) : (
          <Tabs defaultValue="restaurants" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="restaurants" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Rated ({restaurants.length})
              </TabsTrigger>
              <TabsTrigger value="wishlist" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Wishlist ({wishlist.length})
              </TabsTrigger>
            </TabsList>


            <TabsContent value="wishlist" className="mt-6 space-y-4">
              {wishlist.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">No wishlist items yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {friend.username} hasn't added any restaurants to their wishlist
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {wishlist.slice(0, displayedWishlist).map((restaurant) => (
                    <Card key={restaurant.id} className="overflow-hidden">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg sm:text-xl mb-1 break-words">{restaurant.name}</h3>
                            <p className="text-muted-foreground mb-2">{restaurant.cuisine}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="break-words">{restaurant.address}, {restaurant.city}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                            {restaurant.michelin_stars && <MichelinStars stars={restaurant.michelin_stars} />}
                          </div>
                        </div>
                        {restaurant.notes && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <p className="text-sm leading-relaxed break-words">{restaurant.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {/* All wishlist items are shown by default now */}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Utility function to safely store data in sessionStorage with quota handling
const safeSessionStorage = {
  setItem: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`SessionStorage quota exceeded for key: ${key}`);
        // Try to clear some old data and retry
        try {
          const keys = Object.keys(sessionStorage);
          const oldKeys = keys.filter(k => k.startsWith('friendsPage_') && k !== key);
          if (oldKeys.length > 0) {
            // Remove oldest cache entry
            sessionStorage.removeItem(oldKeys[0]);
            sessionStorage.setItem(key, value);
            return true;
          }
        } catch (retryError) {
          console.warn('Could not store data even after cleanup:', retryError);
        }
      } else {
        console.error('SessionStorage error:', error);
      }
      return false;
    }
  },
  
  getStorageSize: () => {
    let total = 0;
    Object.keys(sessionStorage).forEach(key => {
      total += sessionStorage.getItem(key)?.length || 0;
    });
    return total;
  }
};

export function FriendsPage({
  initialViewFriendId, 
  onInitialViewProcessed 
}: { 
  initialViewFriendId?: string | null; 
  onInitialViewProcessed?: () => void; 
} = {}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    friends, 
    pendingRequests, 
    sentRequests, 
    isLoading, 
    sendFriendRequest, 
    respondToFriendRequest, 
    removeFriend, 
    searchUsers 
  } = useFriends();
  const { friendRestaurants, fetchAllFriendsRestaurants, rebuildFriendActivityCache } = useFriendRestaurants();
  
  // Navigation state
  const [currentView, setCurrentView] = useState<'list' | 'profile'>('list');
  const [viewingFriend, setViewingFriend] = useState<any>(null);
  
  // Friend profile data
  const [friendProfile, setFriendProfile] = useState<any>(null);
  const [friendRestaurantsData, setFriendRestaurantsData] = useState<any[]>([]);
  const [friendWishlistData, setFriendWishlistData] = useState<any[]>([]);
  const [friendStats, setFriendStats] = useState<any>({});
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingMoreDetails, setIsLoadingMoreDetails] = useState(false);
  const [displayedRestaurants, setDisplayedRestaurants] = useState(1000); // Show all restaurants by default
  const [displayedWishlist, setDisplayedWishlist] = useState(1000); // Show all wishlist items by default
  
  // Filter and sort states for friend profile
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([0, 10]);
  const [sortBy, setSortBy] = useState('rating'); // Default to highest rated
  const [activeTab, setActiveTab] = useState('overview');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showContactPermission, setShowContactPermission] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cacheWarmed, setCacheWarmed] = useState(false);
  const [profileLoadedRef, setProfileLoadedRef] = useState<string | null>(null); // Track which profile is loaded
  const [sessionRestored, setSessionRestored] = useState(false); // Track if session storage has been restored
  
  // Session storage keys for persistence
  const STORAGE_KEYS = {
    currentView: 'friendsPage_currentView',
    viewingFriend: 'friendsPage_viewingFriend', 
    friendProfile: 'friendsPage_friendProfile',
    friendRestaurants: 'friendsPage_friendRestaurants',
    friendWishlist: 'friendsPage_friendWishlist',
    profileLoadedRef: 'friendsPage_profileLoadedRef'
  };

  // Load persisted state on mount
  useEffect(() => {
    try {
      const savedCurrentView = sessionStorage.getItem(STORAGE_KEYS.currentView);
      const savedViewingFriend = sessionStorage.getItem(STORAGE_KEYS.viewingFriend);
      const savedFriendProfile = sessionStorage.getItem(STORAGE_KEYS.friendProfile);
      const savedFriendRestaurants = sessionStorage.getItem(STORAGE_KEYS.friendRestaurants);
      const savedFriendWishlist = sessionStorage.getItem(STORAGE_KEYS.friendWishlist);
      const savedProfileLoadedRef = sessionStorage.getItem(STORAGE_KEYS.profileLoadedRef);

      if (savedCurrentView) setCurrentView(savedCurrentView as any);
      if (savedViewingFriend) setViewingFriend(JSON.parse(savedViewingFriend));
      if (savedFriendProfile) setFriendProfile(JSON.parse(savedFriendProfile));
      if (savedFriendRestaurants) setFriendRestaurantsData(JSON.parse(savedFriendRestaurants));
      if (savedFriendWishlist) setFriendWishlistData(JSON.parse(savedFriendWishlist));
      if (savedProfileLoadedRef) setProfileLoadedRef(savedProfileLoadedRef);
      
      console.log('🔄 Restored friend profile state from session storage');
    } catch (error) {
      console.error('Error loading persisted state - clearing corrupted cache:', error);
      // Clear corrupted cache data
      try {
        Object.values(STORAGE_KEYS).forEach(key => sessionStorage.removeItem(key));
      } catch (clearError) {
        console.error('Error clearing cache:', clearError);
      }
    } finally {
      // Mark session as restored after attempting to load all data
      setSessionRestored(true);
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    if (currentView !== 'list') {
      sessionStorage.setItem(STORAGE_KEYS.currentView, currentView);
    }
  }, [currentView]);

  useEffect(() => {
    if (viewingFriend) {
      sessionStorage.setItem(STORAGE_KEYS.viewingFriend, JSON.stringify(viewingFriend));
    }
  }, [viewingFriend]);

  useEffect(() => {
    if (friendProfile) {
      // Store only essential profile data to avoid quota issues
      const lightweightProfile = {
        username: friendProfile.username,
        name: friendProfile.name,
        avatar_url: friendProfile.avatar_url,
        is_public: friendProfile.is_public,
        rated_count: friendProfile.rated_count,
        wishlist_count: friendProfile.wishlist_count,
        avg_rating: friendProfile.avg_rating,
        top_cuisine: friendProfile.top_cuisine,
        michelin_count: friendProfile.michelin_count,
        // Only store first 5 recent restaurants to avoid quota issues
        recent_restaurants: Array.isArray(friendProfile.recent_restaurants) 
          ? friendProfile.recent_restaurants.slice(0, 5).map((r: any) => ({
              id: r.id,
              name: r.name,
              cuisine: r.cuisine,
              rating: r.rating,
              created_at: r.created_at
            }))
          : []
      };
      const success = safeSessionStorage.setItem(STORAGE_KEYS.friendProfile, JSON.stringify(lightweightProfile));
      if (!success) {
        console.warn('Storage quota exceeded - storing minimal profile data');
        const minimalProfile = {
          username: friendProfile.username,
          name: friendProfile.name,
          rated_count: friendProfile.rated_count,
          wishlist_count: friendProfile.wishlist_count
        };
        safeSessionStorage.setItem(STORAGE_KEYS.friendProfile, JSON.stringify(minimalProfile));
      }
    }
  }, [friendProfile]);

  useEffect(() => {
    if (friendRestaurantsData.length > 0) {
      // Store ALL restaurant data - remove artificial limits
      const success = safeSessionStorage.setItem(STORAGE_KEYS.friendRestaurants, JSON.stringify(friendRestaurantsData));
      if (!success) {
        console.warn('Storage quota exceeded - storing without session cache');
        // Don't store limited data that will cause confusion
      }
    }
  }, [friendRestaurantsData]);

  useEffect(() => {
    if (friendWishlistData.length > 0) {
      // Store ALL wishlist data - remove artificial limits
      const success = safeSessionStorage.setItem(STORAGE_KEYS.friendWishlist, JSON.stringify(friendWishlistData));
      if (!success) {
        console.warn('Storage quota exceeded - storing without session cache');
        // Don't store limited data that will cause confusion
      }
    }
  }, [friendWishlistData]);

  // Update stats whenever data changes to keep counts accurate
  useEffect(() => {
    if (friendRestaurantsData.length > 0 || friendWishlistData.length > 0) {
      setFriendStats(prev => ({
        ...prev,
        rated_count: friendRestaurantsData.length,
        wishlist_count: friendWishlistData.length
      }));
    }
  }, [friendRestaurantsData, friendWishlistData]);

  useEffect(() => {
    if (profileLoadedRef) {
      sessionStorage.setItem(STORAGE_KEYS.profileLoadedRef, profileLoadedRef);
    }
  }, [profileLoadedRef]);

  useEffect(() => {
    loadInitialActivity();
  }, []);

  // Handle initial friend view from navigation - only process once per friend
  useEffect(() => {
    // Only process after session storage has been restored and friends are loaded
    if (initialViewFriendId && friends.length > 0 && sessionRestored) {
      const friendToView = friends.find(f => f.id === initialViewFriendId);
      if (friendToView) {
        console.log(`🎯 Navigation request for friend: ${friendToView.username}`);
        
        // Check if we already have this friend loaded from session storage
        if (profileLoadedRef === friendToView.id && friendProfile && viewingFriend?.id === friendToView.id) {
          console.log(`✅ Friend ${friendToView.username} already loaded from session - no API call needed`);
          setCurrentView('profile');
        } else {
          console.log(`🔄 Loading fresh profile for: ${friendToView.username}`);
          setViewingFriend(friendToView);
          setCurrentView('profile');
          loadFriendProfile(friendToView);
          setProfileLoadedRef(friendToView.id);
        }
      }
      // Call callback to clear the initial view state
      onInitialViewProcessed?.();
    }
  }, [initialViewFriendId, friends, profileLoadedRef, friendProfile, viewingFriend, sessionRestored, onInitialViewProcessed]);

  const loadInitialActivity = async () => {
    setCurrentPage(0);
    const result = await fetchAllFriendsRestaurants(0, 10); // Limit to 10 recent activities
    setHasMoreActivities(false); // No more loading - show exactly 10 items
  };

  const loadMoreActivities = async () => {
    if (isLoadingMore || !hasMoreActivities) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    const result = await fetchAllFriendsRestaurants(nextPage, 10);
    setCurrentPage(nextPage);
    setHasMoreActivities(result.hasMore);
    setIsLoadingMore(false);
  };

  const handleRefreshCache = async () => {
    const success = await rebuildFriendActivityCache();
    if (success) {
      toast("Friend activity refreshed!");
      loadInitialActivity();
    } else {
      toast("Failed to refresh activity");
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const isAlreadyFriend = (userId: string) => {
    return friends.some(friend => friend.id === userId);
  };

  const hasPendingRequest = (userId: string) => {
    return sentRequests.some(request => request.receiver_id === userId) ||
            pendingRequests.some(request => request.sender_id === userId);
  };

  const handleContactPermission = (contactList: any[]) => {
    setContacts(contactList);
    setShowContactPermission(false);
  };

  // Start chat with friend
  const handleStartChat = async (friendId: string) => {
    try {
      const { data: roomId, error } = await supabase
        .rpc('get_or_create_dm_room', { other_user_id: friendId });

      if (error) {
        console.error('Error creating chat room:', error);
        toast('Failed to start chat');
        return;
      }

      navigate(`/chat/${roomId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast('Failed to start chat');
    }
  };

  // Friend profile navigation
  const handleViewProfile = (friend: any) => {
    console.log(`🎯 handleViewProfile called for: ${friend.username}`);
    
    // Navigate to the dedicated user profile URL instead of using local state
    navigate(`/user/${friend.id}`);
  };

  const handleBackToList = () => {
    console.log(`⬅️ Going back to friends list`);
    setCurrentView('list');
    // Clear session storage when explicitly going back to list
    sessionStorage.removeItem(STORAGE_KEYS.currentView);
    // Keep the friend profile data loaded for faster subsequent access
    // Don't clear viewingFriend, friendProfile, etc. so we can return quickly
  };

  const loadFriendProfile = async (friendData: any) => {
    const startTime = Date.now();
    console.log(`🚀 Loading profile data for: ${friendData.username}`);
    setIsLoadingProfile(true);
    
    try {
      // Phase 1: Load basic profile info quickly (using lightning-fast function)
      const { data: basicProfile, error: basicError } = await supabase
        .rpc('get_lightning_fast_friend_profile', { 
          target_user_id: friendData.id,
          requesting_user_id: user?.id
        })
        .single();

      if (basicError || !basicProfile) {
        console.error('Error fetching basic friend profile:', basicError);
        toast("Failed to load friend profile");
        setIsLoadingProfile(false);
        return;
      }

      if (!basicProfile.can_view) {
        toast("Cannot view this friend's profile");
        setIsLoadingProfile(false);
        return;
      }

      // Show basic profile immediately
      setFriendProfile({
        username: basicProfile.username,
        name: basicProfile.name,
        avatar_url: basicProfile.avatar_url,
        is_public: basicProfile.is_public,
        rated_count: basicProfile.rated_count,
        wishlist_count: basicProfile.wishlist_count,
        avg_rating: basicProfile.avg_rating,
        recent_restaurants: basicProfile.recent_restaurants || []
      });
      
      setFriendStats({
        rated_count: basicProfile.rated_count,
        wishlist_count: basicProfile.wishlist_count,
        avg_rating: basicProfile.avg_rating,
        top_cuisine: '', // Will be loaded in background
        michelin_count: 0 // Will be calculated from loaded data
      });

      // Show the 5 recent restaurants from basic profile
      const recentRestaurants = Array.isArray(basicProfile.recent_restaurants) ? basicProfile.recent_restaurants : [];
      setFriendRestaurantsData(recentRestaurants);

      console.log(`⚡ Basic profile loaded in ${Date.now() - startTime}ms for: ${friendData.username}`);
      setIsLoadingProfile(false);
      
      // Phase 2: Load detailed data in background (non-blocking)
      setTimeout(() => {
        loadDetailedFriendData(friendData.id);
      }, 100); // Small delay to let UI render first
      
    } catch (error) {
      console.error('Error loading friend profile:', error);
      toast("Failed to load friend profile");
      setIsLoadingProfile(false);
    }
  };

  const loadDetailedFriendData = async (friendId: string) => {
    try {
      console.log('🔄 Loading ALL friend data in background...');
      
      // Load ALL restaurants and wishlist with optimized queries - only essential fields first
      const [restaurantsResult, wishlistResult, statsResult] = await Promise.all([
        // Get ALL restaurants with basic info
        supabase
          .from('restaurants')
          .select(`
            id, name, cuisine, rating, address, city, country, 
            price_range, michelin_stars, date_visited, created_at, is_wishlist
          `)
          .eq('user_id', friendId)
          .eq('is_wishlist', false)
          .order('date_visited', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
          // NO LIMIT - load all restaurants
          
        // Get ALL wishlist with basic info
        supabase
          .from('restaurants')
          .select(`
            id, name, cuisine, address, city, country, 
            price_range, michelin_stars, created_at, is_wishlist
          `)
          .eq('user_id', friendId)
          .eq('is_wishlist', true)
          .order('created_at', { ascending: false }),
          // NO LIMIT - load all wishlist items
          
        // Get additional stats from all rated restaurants
        supabase
          .from('restaurants')
          .select('cuisine, michelin_stars')
          .eq('user_id', friendId)
          .eq('is_wishlist', false)
          .not('rating', 'is', null)
      ]);

      // Update restaurants data
      if (restaurantsResult.data && restaurantsResult.data.length > 0) {
        setFriendRestaurantsData(restaurantsResult.data);
        console.log(`✅ Loaded ${restaurantsResult.data.length} restaurants`);
      }
      
      // Update wishlist data  
      if (wishlistResult.data && wishlistResult.data.length > 0) {
        setFriendWishlistData(wishlistResult.data);
        console.log(`✅ Loaded ${wishlistResult.data.length} wishlist items`);
      }
      
      // Calculate additional stats
      if (statsResult.data) {
        const michelinCount = statsResult.data.filter(r => r.michelin_stars && r.michelin_stars > 0).length;
        const cuisines = statsResult.data.map(r => r.cuisine).filter(Boolean);
        const topCuisine = cuisines.length > 0 
          ? cuisines.reduce((acc, cuisine) => {
              acc[cuisine] = (acc[cuisine] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          : {};
        
        const mostPopularCuisine = Object.keys(topCuisine).length > 0
          ? Object.entries(topCuisine).sort(([,a], [,b]) => b - a)[0][0]
          : '';

        // Update stats with calculated values
        setFriendStats(prev => ({
          ...prev,
          top_cuisine: mostPopularCuisine,
          michelin_count: michelinCount
        }));
      }
      
      console.log('✅ Background data loading completed');
      
    } catch (error) {
      console.error('Error loading detailed friend data:', error);
      // Don't show error toast for background loading failures
    }
  };

  
  // Function to load more detailed restaurant data on demand
  const loadMoreRestaurantDetails = async (friendId: string) => {
    setIsLoadingMoreDetails(true);
    try {
      console.log('🔄 Loading ALL detailed restaurant data...');
      
      const { data: detailedRestaurants, error } = await supabase
        .from('restaurants')
        .select(`
          id, name, cuisine, rating, address, city, country, 
          price_range, michelin_stars, date_visited, created_at,
          notes, latitude, longitude, website, phone_number, 
          opening_hours, reservable, reservation_url, is_wishlist
        `)
        .eq('user_id', friendId)
        .eq('is_wishlist', false)
        .order('date_visited', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
        // NO LIMIT - load ALL restaurants with full details

      if (error) {
        console.error('Error loading detailed restaurants:', error);
        return;
      }

      if (detailedRestaurants && detailedRestaurants.length > 0) {
        setFriendRestaurantsData(detailedRestaurants);
        console.log(`✅ Loaded ${detailedRestaurants.length} detailed restaurants`);
      }
    } catch (error) {
      console.error('Error loading more restaurant details:', error);
    } finally {
      setIsLoadingMoreDetails(false);
    }
  };

  const addToWishlist = async (restaurant: any) => {
    if (!user) {
      toast("You must be logged in to add restaurants to your wishlist");
      return;
    }

    try {
      console.log('=== STARTING WISHLIST ADD PROCESS ===');
      console.log('User ID:', user.id);
      console.log('Restaurant object:', JSON.stringify(restaurant, null, 2));
      
      // Validate required fields
      if (!restaurant.name) {
        console.log('ERROR: Missing restaurant name');
        toast("Restaurant name is missing. Please try again.");
        return;
      }
      
      if (!restaurant.cuisine) {
        console.log('ERROR: Missing restaurant cuisine');
        toast("Restaurant cuisine information is missing. Please try again.");
        return;
      }

      // Insert with complete restaurant data including price and stars but NO photos
      const restaurantData = {
        user_id: user.id,
        name: restaurant.name.toString(),
        address: (restaurant.address || '').toString(),
        city: (restaurant.city || 'Unknown').toString(),
        country: restaurant.country || null,
        cuisine: restaurant.cuisine.toString(),
        price_range: restaurant.price_range || null,
        michelin_stars: restaurant.michelin_stars || null,
        notes: restaurant.notes || null,
        latitude: restaurant.latitude || null,
        longitude: restaurant.longitude || null,
        opening_hours: restaurant.opening_hours || null,
        website: restaurant.website || null,
        phone_number: restaurant.phone_number || null,
        photos: [], // Explicitly set empty array for photos
        is_wishlist: true
      };

      console.log('Restaurant data to insert:', JSON.stringify(restaurantData, null, 2));

      const { data, error } = await supabase
        .from('restaurants')
        .insert(restaurantData)
        .select();

      console.log('Supabase response data:', data);
      console.log('Supabase response error:', error);

      if (error) {
        console.error('=== SUPABASE INSERT ERROR ===');
        console.error('Error object:', JSON.stringify(error, null, 2));
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        toast(`Database Error: ${error.message}. Code: ${error.code}`);
      } else {
        console.log('=== SUCCESS ===');
        console.log('Inserted data:', data);
        toast(`${restaurant.name} added to your wishlist!`);
      }
    } catch (error) {
      console.error('=== CATCH BLOCK ERROR ===');
      console.error('Error:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast(`Failed to add restaurant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const shareRestaurant = async (restaurant: any) => {
    const shareText = `Check out ${restaurant.name} in ${restaurant.city}! ${restaurant.cuisine} cuisine${restaurant.rating ? ` • Rated ${restaurant.rating}/10` : ''}${restaurant.michelin_stars ? ` • ${restaurant.michelin_stars} Michelin Star${restaurant.michelin_stars > 1 ? 's' : ''}` : ''}`;
    const shareUrl = `${window.location.origin}/restaurant/${restaurant.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: shareText,
          url: shareUrl,
        });
        toast("Restaurant shared successfully");
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          fallbackShare(shareText, shareUrl);
        }
      }
    } else {
      fallbackShare(shareText, shareUrl);
    }
  };

  const fallbackShare = (text: string, url: string) => {
    const fullText = `${text}\n${url}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText).then(() => {
        toast("Restaurant details copied. You can now paste and share them.");
      }).catch(() => {
        showShareOptions(text, url);
      });
    } else {
      showShareOptions(text, url);
    }
  };

  const showShareOptions = (text: string, url: string) => {
    const fullText = `${text}\n${url}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Check out ${text.split(' in ')[0]}`)}&body=${encodeURIComponent(fullText)}`;
    const smsUrl = `sms:?body=${encodeURIComponent(fullText)}`;
    
    // Create a simple alert with sharing options
    if (confirm('Share via email or copy to clipboard?\n\nClick OK for email, Cancel to copy to clipboard.')) {
      window.open(mailtoUrl, '_blank');
    } else {
      // Try to copy to clipboard manually
      const textArea = document.createElement('textarea');
      textArea.value = fullText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast("Restaurant details copied. You can now paste and share them.");
      } catch (err) {
        console.error('Failed to copy text: ', err);
        toast(`Copy this: ${fullText}`);
      }
      document.body.removeChild(textArea);
    }
  };

  // Interactive filter functions for statistics
  const handleRatingRangeClick = (min: number, max: number) => {
    console.log('Rating range clicked:', min, max);
    setRatingRange([min, max]);
    // Reset other filters when clicking rating statistic
    setSelectedCuisines([]);
    setSelectedCities([]);
    setSelectedPriceRanges([]);
    setSearchTerm('');
    setActiveTab('restaurants');
    console.log('Active tab set to restaurants');
  };

  const handleCuisineClick = (cuisine: string) => {
    console.log('Cuisine clicked:', cuisine);
    setSelectedCuisines([cuisine]);
    // Reset other filters when clicking cuisine statistic
    setRatingRange([0, 10]);
    setSelectedCities([]);
    setSelectedPriceRanges([]);
    setSearchTerm('');
    setActiveTab('restaurants');
    console.log('Active tab set to restaurants');
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCuisines([]);
    setSelectedCities([]);
    setSelectedPriceRanges([]);
    setRatingRange([0, 10]);
    setSortBy('rating'); // Reset to highest rated default
  };

  // Filter and sort restaurants for friend profile
  const filteredAndSortedRestaurants = useMemo(() => {
    let filtered = friendRestaurantsData;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.cuisine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        restaurant.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply cuisine filter
    if (selectedCuisines.length > 0) {
      filtered = filtered.filter(restaurant => 
        selectedCuisines.includes(restaurant.cuisine)
      );
    }

    // Apply city filter
    if (selectedCities.length > 0) {
      filtered = filtered.filter(restaurant => 
        selectedCities.includes(restaurant.city)
      );
    }

    // Apply price range filter
    if (selectedPriceRanges.length > 0) {
      filtered = filtered.filter(restaurant => 
        selectedPriceRanges.includes(restaurant.price_range)
      );
    }

    // Apply rating filter
    const [minRating, maxRating] = ratingRange;
    filtered = filtered.filter(restaurant => {
      const rating = restaurant.rating || 0;
      return rating >= minRating && rating <= maxRating;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cuisine':
          return (a.cuisine || '').localeCompare(b.cuisine || '');
        case 'oldest':
          return new Date(a.date_visited || a.created_at).getTime() - new Date(b.date_visited || b.created_at).getTime();
        case 'newest':
        default:
          return new Date(b.date_visited || b.created_at).getTime() - new Date(a.date_visited || a.created_at).getTime();
      }
    });

    return sorted;
  }, [friendRestaurantsData, searchTerm, selectedCuisines, selectedCities, selectedPriceRanges, ratingRange, sortBy]);

  // Get unique cuisines for filter, sorted alphabetically with adaptive counts
  const uniqueCuisines = useMemo(() => {
    // Filter by selected cities first to get adaptive counts
    const filteredByCity = selectedCities.length === 0 
      ? friendRestaurantsData 
      : friendRestaurantsData.filter(restaurant => selectedCities.includes(restaurant.city));
    
    const cuisineCounts = filteredByCity.reduce((acc, restaurant) => {
      if (restaurant.cuisine) {
        acc[restaurant.cuisine] = (acc[restaurant.cuisine] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(cuisineCounts)
      .map(([cuisine, count]): { name: string; count: number } => ({ name: cuisine, count: count as number }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [friendRestaurantsData, selectedCities]);

  // Get unique cities for filter, sorted alphabetically with adaptive counts
  const uniqueCities = useMemo(() => {
    // Filter by selected cuisines first to get adaptive counts
    const filteredByCuisine = selectedCuisines.length === 0 
      ? friendRestaurantsData 
      : friendRestaurantsData.filter(restaurant => selectedCuisines.includes(restaurant.cuisine));
    
    const cityCounts = filteredByCuisine.reduce((acc, restaurant) => {
      if (restaurant.city) {
        acc[restaurant.city] = (acc[restaurant.city] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(cityCounts)
      .map(([city, count]): { name: string; count: number } => ({ name: city, count: count as number }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [friendRestaurantsData, selectedCuisines]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading your friends...</p>
        </div>
      </div>
    );
  }

  // Friend Profile View
  if (currentView === 'profile' && viewingFriend) {
    return (
      <div className="w-full px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Friends
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={viewingFriend.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {viewingFriend.username?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">@{viewingFriend.username}</h1>
              {viewingFriend.name && (
                <p className="text-lg text-muted-foreground">{viewingFriend.name}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={viewingFriend.is_public ? "default" : "secondary"}>
                  {viewingFriend.is_public ? 'Public Profile' : 'Private Profile'}
                </Badge>
                <Badge variant="outline">
                  <Star className="h-3 w-3 mr-1" />
                  Score: {viewingFriend.score}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {isLoadingProfile ? (
          <FriendProfileSkeleton />
        ) : friendProfile ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{friendStats.rated_count}</div>
                  <div className="text-sm text-muted-foreground">Rated</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{friendStats.wishlist_count}</div>
                  <div className="text-sm text-muted-foreground">Wishlist</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{friendStats.avg_rating?.toFixed(1) || '0.0'}</div>
                  <div className="text-sm text-muted-foreground">Avg Rating</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="h-8 w-8 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold">{friendStats.michelin_count}</div>
                  <div className="text-sm text-muted-foreground">Michelin Stars</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="restaurants">Restaurants ({friendRestaurantsData.length})</TabsTrigger>
                <TabsTrigger value="wishlist">Wishlist ({friendWishlistData.length})</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6">
                <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-3">
                  {/* Recent Activity */}
                  <div className="xl:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {!friendRestaurantsData || friendRestaurantsData.length === 0 ? (
                          <div className="text-center py-8">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No recent activity</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {friendRestaurantsData.slice(0, 5).map((restaurant: any) => (
                              <div key={restaurant.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium break-words">{restaurant.name}</h4>
                                  <p className="text-sm text-muted-foreground">{restaurant.cuisine}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {restaurant.date_visited 
                                      ? new Date(restaurant.date_visited).toLocaleDateString()
                                      : `Added: ${new Date(restaurant.created_at).toLocaleDateString()}`
                                    }
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="flex items-center gap-2">
                                    <StarRating rating={restaurant.rating} readonly size="sm" />
                                    <span className="font-medium">{restaurant.rating?.toFixed(1)}</span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const returnUrl = `/user/${viewingFriend?.id}`;
                                      navigate(`/restaurant/${restaurant.id}?friendId=${viewingFriend?.id}&returnUrl=${encodeURIComponent(returnUrl)}`);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Details
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stats Sidebar */}
                  <div className="space-y-6">
                    {/* Top Cuisines */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <ChefHat className="h-5 w-5" />
                          Favorite Cuisines
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {uniqueCuisines.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No cuisine data available</p>
                        ) : (
                          <div className="space-y-3">
                            {uniqueCuisines.slice(0, 5).map(({ name, count }, index) => {
                              const percentage = Math.round((count / friendRestaurantsData.length) * 100);
                              return (
                                <div 
                                  key={name} 
                                  className="flex items-center justify-between hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                                  onClick={() => handleCuisineClick(name)}
                                >
                                  <span className="text-sm font-medium">{name}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary rounded-full" 
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8">{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Rating Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BarChart3 className="h-5 w-5" />
                          Rating Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {friendRestaurantsData.length === 0 ? (
                          <p className="text-muted-foreground text-sm">No rating data available</p>
                        ) : (
                          <div className="space-y-3">
                            {[
                              { label: '9-10 Stars', min: 9, max: 10, color: 'bg-green-500' },
                              { label: '7-8 Stars', min: 7, max: 8.9, color: 'bg-blue-500' },
                              { label: '5-6 Stars', min: 5, max: 6.9, color: 'bg-yellow-500' },
                              { label: '0-4 Stars', min: 0, max: 4.9, color: 'bg-red-500' }
                            ].map(range => {
                              const count = friendRestaurantsData.filter(r => 
                                r.rating >= range.min && r.rating <= range.max
                              ).length;
                              const percentage = friendRestaurantsData.length > 0 
                                ? Math.round((count / friendRestaurantsData.length) * 100) 
                                : 0;
                              return (
                                <div 
                                  key={range.label} 
                                  className="flex items-center justify-between hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                                  onClick={() => handleRatingRangeClick(range.min, range.max)}
                                >
                                  <span className="text-sm font-medium">{range.label}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${range.color} rounded-full`} 
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8">{count}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="restaurants" className="mt-6">
                {/* Filters and search for restaurants */}
                <div className="space-y-4 mb-6">
                  {/* Search Bar */}
                  <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border shadow-sm">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search restaurants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filters Section */}
                  <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Filters</span>
                      </div>
                      {(selectedCuisines.length > 0 || selectedCities.length > 0 || selectedPriceRanges.length > 0 || ratingRange[0] !== 0 || ratingRange[1] !== 10) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={clearAllFilters}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Cuisine Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cuisine</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {selectedCuisines.length === 0 ? "All Cuisines" : 
                               selectedCuisines.length === 1 ? selectedCuisines[0] :
                               `${selectedCuisines.length} selected`}
                              <ChefHat className="ml-2 h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4">
                            <div className="space-y-3">
                              <div className="font-medium">Select Cuisines</div>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {uniqueCuisines.map(({ name, count }) => (
                                  <div key={name} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={name}
                                      checked={selectedCuisines.includes(name)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCuisines([...selectedCuisines, name]);
                                        } else {
                                          setSelectedCuisines(selectedCuisines.filter(c => c !== name));
                                        }
                                      }}
                                    />
                                    <label htmlFor={name} className="text-sm cursor-pointer">
                                      {name} ({count})
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* City Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">City</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {selectedCities.length === 0 ? "All Cities" : 
                               selectedCities.length === 1 ? selectedCities[0] :
                               `${selectedCities.length} selected`}
                              <MapPin className="ml-2 h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-4 z-50 bg-background">
                            <div className="space-y-3">
                              <div className="font-medium">Select Cities</div>
                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {uniqueCities.map(({ name, count }) => (
                                  <div key={name} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={name}
                                      checked={selectedCities.includes(name)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCities([...selectedCities, name]);
                                        } else {
                                          setSelectedCities(selectedCities.filter(c => c !== name));
                                        }
                                      }}
                                    />
                                    <label htmlFor={name} className="text-sm cursor-pointer">
                                      {name} ({count})
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Price Range Filter */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Price Range</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {selectedPriceRanges.length === 0 ? "All Prices" : 
                               selectedPriceRanges.length === 1 ? `${"$".repeat(selectedPriceRanges[0])}` :
                               `${selectedPriceRanges.length} selected`}
                              <span className="ml-2">💰</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-4">
                            <div className="space-y-3">
                              <div className="font-medium">Select Price Ranges</div>
                              <div className="space-y-2">
                                {[1, 2, 3, 4].map(price => (
                                  <div key={price} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`price-${price}`}
                                      checked={selectedPriceRanges.includes(price)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedPriceRanges([...selectedPriceRanges, price]);
                                        } else {
                                          setSelectedPriceRanges(selectedPriceRanges.filter(p => p !== price));
                                        }
                                      }}
                                    />
                                    <label htmlFor={`price-${price}`} className="text-sm cursor-pointer">
                                      {"$".repeat(price)}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Rating Range */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rating: {ratingRange[0]} - {ratingRange[1]}</label>
                        <div className="px-2">
                          <Slider
                            value={ratingRange}
                            onValueChange={(value) => setRatingRange([value[0], value[1]])}
                            max={10}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm text-muted-foreground mt-3 px-1">
                            <span className="flex justify-center w-4">0</span>
                            <span className="flex justify-center w-4">10</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sort and Results */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Sort by:</span>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="rating">Highest Rated</SelectItem>
                            <SelectItem value="name">Name A-Z</SelectItem>
                            <SelectItem value="cuisine">Cuisine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{filteredAndSortedRestaurants.length} of {friendRestaurantsData.length} restaurants</span>
                    </div>
                  </div>

                  {/* All restaurants are shown by default now */}
                </div>

                {/* Restaurants Grid */}
                <div className="grid gap-6">
                  {filteredAndSortedRestaurants.slice(0, displayedRestaurants).map((restaurant) => (
                    <Card key={restaurant.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
                          {/* Restaurant Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold mb-2">{restaurant.name}</h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <ChefHat className="h-4 w-4" />
                                {restaurant.cuisine}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {restaurant.city}
                              </span>
                              {restaurant.date_visited && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(restaurant.date_visited).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                              {restaurant.michelin_stars > 0 && <MichelinStars stars={restaurant.michelin_stars} />}
                            </div>
                          </div>

                          {/* Rating and Actions */}
                          <div className="flex sm:flex-col items-start sm:items-end gap-4">
                            <div className="text-center sm:text-right">
                              <div className="flex items-center gap-2 mb-3">
                                <StarRating rating={restaurant.rating} readonly size="sm" />
                                <span className="font-bold text-xl">{restaurant.rating?.toFixed(1)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => addToWishlist(restaurant)}
                                className="p-2"
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => shareRestaurant(restaurant)}
                                className="p-2"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Navigate to restaurant detail page
                                  const returnUrl = `/user/${viewingFriend?.id}`;
                                  navigate(`/restaurant/${restaurant.id}?friendId=${viewingFriend?.id}&returnUrl=${encodeURIComponent(returnUrl)}`);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* All restaurants are shown by default now */}

                  {filteredAndSortedRestaurants.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">No restaurants found matching your filters.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="wishlist" className="mt-6">
                {/* Wishlist Filter */}
                <div className="mb-6 flex gap-3 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select 
                    value={selectedCities.length === 1 ? selectedCities[0] : ""} 
                    onValueChange={(value) => {
                      if (value === "all") {
                        setSelectedCities([]);
                      } else {
                        setSelectedCities([value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {Array.from(new Set(friendWishlistData.map(r => r.city))).sort().map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCities.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedCities([])}
                    >
                      Clear Filter
                    </Button>
                  )}
                </div>
                
                {/* Wishlist Items */}
                <div className="grid gap-6">
                  {friendWishlistData.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-lg text-muted-foreground">No wishlist items yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {viewingFriend.username} hasn't added any restaurants to their wishlist
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {friendWishlistData
                        .filter(restaurant => 
                          selectedCities.length === 0 || selectedCities.includes(restaurant.city)
                        )
                        .slice(0, displayedWishlist)
                        .map((restaurant) => (
                        <Card key={restaurant.id} className="overflow-hidden">
                          <CardContent className="p-6">
                            <div className="grid md:grid-cols-3 gap-6">
                              <div className="md:col-span-2 space-y-4">
                                <div>
                                  <h3 className="text-xl font-bold mb-2">{restaurant.name}</h3>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                                    <span className="flex items-center gap-1">
                                      <ChefHat className="h-4 w-4" />
                                      {restaurant.cuisine}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {restaurant.city}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    {restaurant.price_range && <PriceRange priceRange={restaurant.price_range} />}
                                    {restaurant.michelin_stars > 0 && <MichelinStars stars={restaurant.michelin_stars} />}
                                  </div>
                                </div>
                                
                                {restaurant.notes && (
                                  <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm leading-relaxed">{restaurant.notes}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex md:flex-col items-start md:items-end gap-4">
                                <div className="flex flex-col gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Navigate to restaurant detail page
                                      const returnUrl = `/user/${viewingFriend?.id}`;
                                      navigate(`/restaurant/${restaurant.id}?friendId=${viewingFriend?.id}&returnUrl=${encodeURIComponent(returnUrl)}`);
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => shareRestaurant(restaurant)}
                                    className="flex items-center gap-2"
                                  >
                                    <Share2 className="h-4 w-4" />
                                    Share
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addToWishlist(restaurant)}
                                    className="flex items-center gap-2"
                                  >
                                    <Heart className="h-4 w-4" />
                                    Add to My Wishlist
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* All wishlist items are shown by default now */}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                {/* Detailed Statistics */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Rating Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Average Rating</span>
                          <span className="font-bold">{friendStats.avg_rating?.toFixed(2) || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Rated</span>
                          <span className="font-bold">{friendStats.rated_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Wishlist Items</span>
                          <span className="font-bold">{friendStats.wishlist_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Michelin Stars</span>
                          <span className="font-bold">{friendStats.michelin_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ChefHat className="h-5 w-5" />
                        Cuisine Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {uniqueCuisines.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No cuisine data available</p>
                      ) : (
                        <div className="space-y-3">
                          {uniqueCuisines.slice(0, 6).map(({ name, count }) => {
                            const percentage = Math.round((count / friendRestaurantsData.length) * 100);
                             return (
                               <div 
                                 key={name} 
                                 className="flex items-center justify-between hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                                 onClick={() => handleCuisineClick(name)}
                               >
                                 <span className="text-sm font-medium truncate">{name}</span>
                                 <div className="flex items-center gap-2">
                                   <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                     <div 
                                       className="h-full bg-primary rounded-full" 
                                       style={{ width: `${percentage}%` }}
                                     />
                                   </div>
                                   <span className="text-xs text-muted-foreground w-6">{count}</span>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Rating Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {friendRestaurantsData.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No rating data available</p>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { label: '9-10', min: 9, max: 10, color: 'bg-green-500' },
                            { label: '7-8', min: 7, max: 8.9, color: 'bg-blue-500' },
                            { label: '5-6', min: 5, max: 6.9, color: 'bg-yellow-500' },
                            { label: '0-4', min: 0, max: 4.9, color: 'bg-red-500' }
                          ].map(range => {
                            const count = friendRestaurantsData.filter(r => 
                              r.rating >= range.min && r.rating <= range.max
                            ).length;
                            const percentage = friendRestaurantsData.length > 0 
                              ? Math.round((count / friendRestaurantsData.length) * 100) 
                              : 0;
                             return (
                               <div 
                                 key={range.label} 
                                 className="flex items-center justify-between hover:bg-muted/50 p-2 rounded cursor-pointer transition-colors"
                                 onClick={() => handleRatingRangeClick(range.min, range.max)}
                               >
                                 <span className="text-sm font-medium">{range.label}</span>
                                 <div className="flex items-center gap-2">
                                   <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                                     <div 
                                       className={`h-full ${range.color} rounded-full`} 
                                       style={{ width: `${percentage}%` }}
                                     />
                                   </div>
                                   <span className="text-xs text-muted-foreground w-6">{count}</span>
                                 </div>
                               </div>
                             );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Failed to load profile data</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Friends</h1>
            <p className="text-muted-foreground">Connect with others and discover great restaurants</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowContactPermission(true)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Phone className="h-4 w-4" />
          Find from Contacts
        </Button>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12 mb-6">
          <TabsTrigger value="activity" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-1">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-xs">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs">({friends.length})</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-1">
            <Search className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-xs">Search</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-1">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs">({pendingRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex flex-col sm:flex-row items-center gap-1 text-xs px-1">
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs">({sentRequests.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Friends List Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Friends ({friends.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                  {isLoading && friends.length === 0 ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <FriendCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No friends yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Search for people to connect with!
                      </p>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <div 
                        key={friend.id} 
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                         onClick={() => setSelectedFriend(friend)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url || ''} />
                            <AvatarFallback>
                              {friend.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">@{friend.username}</div>
                            {friend.name && (
                              <div className="text-sm text-muted-foreground">{friend.name}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              Score: {friend.score}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={friend.is_public ? "default" : "secondary"} className="text-xs">
                            {friend.is_public ? 'Public' : 'Private'}
                          </Badge>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Activity Feed */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Recent Friend Activity
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefreshCache}
                      className="flex items-center gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {friendRestaurants.length === 0 && !isLoading ? (
                    <div className="text-center py-12">
                      <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg text-muted-foreground mb-2">No recent activity</p>
                      <p className="text-sm text-muted-foreground">
                        When your friends rate restaurants, their activity will appear here
                      </p>
                    </div>
                  ) : (
                      <div className="space-y-4">
                        <div className="max-h-[600px] overflow-y-auto space-y-4">
                          {friendRestaurants.map((restaurant: any, index: number) => (
                            <div key={`${restaurant.id || restaurant.restaurant_id}-${restaurant.userId || restaurant.friend_id}-${index}`} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                              <Avatar className="h-10 w-10 flex-shrink-0 self-start">
                                <AvatarFallback>
                                  {restaurant.friend_username?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium break-words">@{restaurant.friend_username}</span>
                                    <span className="text-muted-foreground text-sm">rated</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-4 w-4 ${
                                            star <= (restaurant.rating || 0)
                                              ? 'fill-yellow-400 text-yellow-400'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="font-semibold text-base">{restaurant.rating?.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg mb-1 break-words">{restaurant.name || restaurant.restaurant_name}</h4>
                                  <p className="text-sm text-muted-foreground mb-2 break-words">
                                    {restaurant.cuisine} 
                                    {restaurant.city && ` • ${restaurant.city}`}
                                    {restaurant.address && ` • ${restaurant.address}`}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {(restaurant.priceRange || restaurant.price_range) && <PriceRange priceRange={restaurant.priceRange || restaurant.price_range} />}
                                    {(restaurant.michelinStars || restaurant.michelin_stars) && <MichelinStars stars={restaurant.michelinStars || restaurant.michelin_stars} />}
                                    <span className="text-xs text-muted-foreground">
                                      {(restaurant.dateVisited || restaurant.date_visited)
                                        ? new Date(restaurant.dateVisited || restaurant.date_visited).toLocaleDateString()
                                        : new Date(restaurant.createdAt || restaurant.created_at).toLocaleDateString()
                                      }
                                    </span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const restaurantId = restaurant.id || restaurant.restaurant_id;
                                      const friendId = restaurant.userId || restaurant.friend_id;
                                      const returnUrl = `/user/${friendId}`;
                                      navigate(`/restaurant/${restaurantId}?friendId=${friendId}&returnUrl=${encodeURIComponent(returnUrl)}`);
                                    }}
                                    className="flex items-center gap-2 flex-shrink-0"
                                  >
                                    <Eye className="h-4 w-4" />
                                    Details
                                  </Button>
                                </div>
                                {restaurant.notes && (
                                  <p className="text-sm p-2 bg-muted/50 rounded text-muted-foreground italic break-words">
                                    "{restaurant.notes}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      
                      
                      {isLoading && friendRestaurants.length === 0 && (
                        <ActivityFeedSkeleton />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Friends ({friends.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && friends.length === 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <FriendCardSkeleton key={i} />
                  ))}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">No friends yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start by searching for people to connect with!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex flex-col p-6 border rounded-lg hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar_url || ''} />
                          <AvatarFallback className="text-lg">
                            {friend.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate">@{friend.username}</div>
                          {friend.name && (
                            <div className="text-sm text-muted-foreground truncate">{friend.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={friend.is_public ? "default" : "secondary"}>
                            {friend.is_public ? 'Public' : 'Private'}
                          </Badge>
                          <Badge variant="outline">
                            <Star className="h-3 w-3 mr-1" />
                            {friend.score}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewProfile(friend)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFriend(friend.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Find Friends
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Searching for users...</p>
                  </div>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {searchResults.map((result) => (
                    <div key={result.id} className="flex flex-col p-6 border rounded-lg hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={result.avatar_url || ''} />
                          <AvatarFallback className="text-lg">
                            {result.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate">@{result.username}</div>
                          {result.name && (
                            <div className="text-sm text-muted-foreground truncate">{result.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="mb-4">
                        <Badge variant={result.is_public ? "default" : "secondary"}>
                          {result.is_public ? 'Public Profile' : 'Private Profile'}
                        </Badge>
                      </div>
                      <Button
                        className="w-full"
                        disabled={isAlreadyFriend(result.id) || hasPendingRequest(result.id)}
                        onClick={() => sendFriendRequest(result.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isAlreadyFriend(result.id) 
                          ? 'Already Friends' 
                          : hasPendingRequest(result.id) 
                          ? 'Request Pending' 
                          : 'Send Friend Request'
                        }
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">No users found</p>
                  <p className="text-sm text-muted-foreground">
                    No users found matching "{searchQuery}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Friend Requests Received ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">No pending requests</p>
                  <p className="text-sm text-muted-foreground">
                    When someone sends you a friend request, it will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex flex-col p-6 border rounded-lg hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.sender?.avatar_url || ''} />
                          <AvatarFallback className="text-lg">
                            {request.sender?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate">@{request.sender?.username}</div>
                          {request.sender?.name && (
                            <div className="text-sm text-muted-foreground truncate">{request.sender.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => respondToFriendRequest(request.id, true)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => respondToFriendRequest(request.id, false)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Friend Requests Sent ({sentRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Send className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-2">No sent requests</p>
                  <p className="text-sm text-muted-foreground">
                    Friend requests you send will appear here
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sentRequests.map((request) => (
                    <div key={request.id} className="flex flex-col p-6 border rounded-lg">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.receiver?.avatar_url || ''} />
                          <AvatarFallback className="text-lg">
                            {request.receiver?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate">@{request.receiver?.username}</div>
                          {request.receiver?.name && (
                            <div className="text-sm text-muted-foreground truncate">{request.receiver.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Badge variant="secondary" className="px-4 py-2">
                          <Clock className="h-3 w-3 mr-2" />
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Permission Dialog */}
      <Dialog open={showContactPermission} onOpenChange={setShowContactPermission}>
        <DialogContent>
          <ContactPermission
            onPermissionGranted={handleContactPermission}
            onPermissionDenied={() => setShowContactPermission(false)}
          />
        </DialogContent>
      </Dialog>

        {/* Friend Profile Popup */}
        <FriendProfilePopup 
          friend={selectedFriend}
          isOpen={!!selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onViewProfile={handleViewProfile}
        />
    </div>
  );
}
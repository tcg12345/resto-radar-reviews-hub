import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
import { FriendCardSkeleton } from '@/components/skeletons/FriendCardSkeleton';
import { 
  Search, 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  Award,
  ChefHat,
  Camera,
  Video,
  MoreHorizontal,
  UserPlus,
  TrendingUp,
  Filter,
  Calendar,
  ThumbsUp,
  Eye,
  Play,
  X,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface FeedPageProps {
  onNavigate?: (tab: string) => void;
}

interface FriendActivity {
  id: string;
  friend_id: string;
  friend_username: string;
  friend_name?: string;
  friend_avatar?: string;
  restaurant_name: string;
  restaurant_city: string;
  restaurant_cuisine: string;
  restaurant_rating?: number;
  restaurant_photos: string[];
  restaurant_price_range?: number;
  restaurant_michelin_stars?: number;
  activity_type: 'rating' | 'wishlist';
  notes?: string;
  created_at: string;
}

interface ExpertReview {
  id: string;
  expert_name: string;
  expert_avatar?: string;
  expert_badge: string;
  restaurant_name: string;
  restaurant_city: string;
  expert_score: number;
  review_content: string;
  booking_link?: string;
  created_at: string;
}

interface DiscoveryBlock {
  id: string;
  title: string;
  subtitle: string;
  restaurants: Array<{
    id: string;
    name: string;
    city: string;
    cuisine: string;
    photos: string[];
    rating?: number;
    price_range?: number;
  }>;
  type: 'trending' | 'new_openings' | 'hidden_gems' | 'seasonal';
}

export default function FeedPage({ onNavigate }: FeedPageProps) {
  const { user, profile } = useAuth();
  const { friends, searchUsers } = useFriends();
  const { fetchAllFriendsRestaurants } = useFriendRestaurants();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Feed data
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([]);
  const [expertReviews, setExpertReviews] = useState<ExpertReview[]>([]);
  const [discoveryBlocks, setDiscoveryBlocks] = useState<DiscoveryBlock[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<any[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  // Feed management
  const [feedData, setFeedData] = useState<any[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  // Load initial feed data
  useEffect(() => {
    loadFeedData();
    loadSuggestedFriends();
  }, [activeTab]);

  const loadFeedData = async () => {
    setIsLoading(true);
    try {
      // Load friend activities
      if (activeTab === 'all' || activeTab === 'friends') {
        const friendsData = await fetchAllFriendsRestaurants(1, 10);
        const activities: FriendActivity[] = friendsData.activities.map((activity: any) => ({
          id: activity.id,
          friend_id: activity.friend_id,
          friend_username: activity.friend_username,
          friend_name: activity.friend_name,
          friend_avatar: activity.friend_avatar,
          restaurant_name: activity.restaurant_name,
          restaurant_city: activity.restaurant_city,
          restaurant_cuisine: activity.restaurant_cuisine,
          restaurant_rating: activity.restaurant_rating,
          restaurant_photos: activity.restaurant_photos || [],
          restaurant_price_range: activity.restaurant_price_range,
          restaurant_michelin_stars: activity.restaurant_michelin_stars,
          activity_type: activity.is_wishlist ? 'wishlist' : 'rating',
          notes: activity.notes,
          created_at: activity.created_at
        }));
        setFriendActivities(activities);
      }

      // Mock expert reviews for now
      if (activeTab === 'all' || activeTab === 'experts') {
        const mockExpertReviews: ExpertReview[] = [
          {
            id: '1',
            expert_name: 'Chef Marcus Williams',
            expert_avatar: '',
            expert_badge: 'Michelin Expert',
            restaurant_name: 'Le Bernardin',
            restaurant_city: 'New York',
            expert_score: 9.2,
            review_content: 'Exceptional seafood preparation with unparalleled technique. The crudo selection demonstrates masterful knife work and flavor balance.',
            booking_link: 'https://resy.com/le-bernardin',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            expert_name: 'Isabella Rodriguez',
            expert_avatar: '',
            expert_badge: 'James Beard Winner',
            restaurant_name: 'Osteria Mozza',
            restaurant_city: 'Los Angeles',
            expert_score: 8.8,
            review_content: 'The bone marrow with herbs is a revelation. Nancy Silverton continues to push boundaries while honoring Italian traditions.',
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
          }
        ];
        setExpertReviews(mockExpertReviews);
      }

      // Mock discovery blocks
      if (activeTab === 'all') {
        const mockDiscoveryBlocks: DiscoveryBlock[] = [
          {
            id: '1',
            title: 'Best New Openings in Your City',
            subtitle: 'Fresh dining experiences trending now',
            type: 'new_openings',
            restaurants: [
              {
                id: '1',
                name: 'Noma Copenhagen',
                city: 'Copenhagen',
                cuisine: 'Nordic',
                photos: ['/placeholder.svg'],
                rating: 9.5,
                price_range: 4
              },
              {
                id: '2',
                name: 'Hawker Chan',
                city: 'Singapore',
                cuisine: 'Asian',
                photos: ['/placeholder.svg'],
                rating: 9.0,
                price_range: 1
              }
            ]
          }
        ];
        setDiscoveryBlocks(mockDiscoveryBlocks);
      }

      // Combine and sort all feed items
      const allFeedItems = [];
      
      if (activeTab === 'all') {
        allFeedItems.push(
          ...friendActivities.map(item => ({ ...item, type: 'friend_activity' })),
          ...expertReviews.map(item => ({ ...item, type: 'expert_review' })),
          ...discoveryBlocks.map(item => ({ ...item, type: 'discovery_block' }))
        );
      } else if (activeTab === 'friends') {
        allFeedItems.push(...friendActivities.map(item => ({ ...item, type: 'friend_activity' })));
      } else if (activeTab === 'experts') {
        allFeedItems.push(...expertReviews.map(item => ({ ...item, type: 'expert_review' })));
      }

      // Sort by created_at
      allFeedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setFeedData(allFeedItems);
    } catch (error) {
      console.error('Error loading feed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestedFriends = async () => {
    try {
      // Mock suggested friends for now
      const mockSuggestions = [
        {
          id: '1',
          username: 'foodie_jane',
          name: 'Jane Smith',
          avatar: '',
          top_cuisine: 'Italian',
          city: 'San Francisco',
          mutual_friends: 3,
          follower_count: 1250
        },
        {
          id: '2',
          username: 'chef_mike',
          name: 'Mike Johnson',
          avatar: '',
          top_cuisine: 'French',
          city: 'New York',
          mutual_friends: 7,
          follower_count: 2100
        },
        {
          id: '3',
          username: 'sushi_master',
          name: 'Kenji Tanaka',
          avatar: '',
          top_cuisine: 'Japanese',
          city: 'Tokyo',
          mutual_friends: 1,
          follower_count: 890
        }
      ];
      setSuggestedFriends(mockSuggestions);
    } catch (error) {
      console.error('Error loading suggested friends:', error);
    }
  };

  const loadMoreContent = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      // Load more content based on active tab
      // For now, just simulate loading more
      setTimeout(() => {
        setPage(nextPage);
        setIsLoadingMore(false);
        if (nextPage >= 3) setHasMore(false);
      }, 1000);
    } catch (error) {
      console.error('Error loading more content:', error);
      setIsLoadingMore(false);
    }
  };

  const handleFollow = async (userId: string) => {
    // Implement follow functionality
    console.log('Following user:', userId);
  };

  const handleLike = async (itemId: string, itemType: string) => {
    // Implement like functionality
    console.log('Liking item:', itemId, itemType);
  };

  const handleComment = (itemId: string) => {
    // Navigate to comment view
    console.log('Opening comments for:', itemId);
  };

  const handleShare = (itemId: string) => {
    // Implement share functionality
    console.log('Sharing item:', itemId);
  };

  const handleAddToWishlist = (restaurantData: any) => {
    // Implement wishlist functionality
    console.log('Adding to wishlist:', restaurantData);
  };

  const pullToRefresh = async () => {
    setPage(1);
    setHasMore(true);
    await loadFeedData();
  };

  const renderFriendActivityCard = (activity: FriendActivity) => (
    <Card key={activity.id} className="overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.friend_avatar} />
            <AvatarFallback>{activity.friend_username.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{activity.friend_name || activity.friend_username}</span>
              {activity.activity_type === 'rating' ? (
                <Badge variant="secondary" className="text-xs">Rated</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Wishlisted</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {activity.created_at && !isNaN(new Date(activity.created_at).getTime()) 
                ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
                : 'Recently'}
            </p>
          </div>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {activity.restaurant_photos.length > 0 && (
              <div className="flex-shrink-0">
                <img
                  src={activity.restaurant_photos[0]}
                  alt={activity.restaurant_name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div>
                <h3 className="font-semibold text-base">{activity.restaurant_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{activity.restaurant_city}</span>
                  <span>•</span>
                  <span>{activity.restaurant_cuisine}</span>
                  {activity.restaurant_price_range && (
                    <>
                      <span>•</span>
                      <span>{'$'.repeat(activity.restaurant_price_range)}</span>
                    </>
                  )}
                </div>
              </div>

              {activity.restaurant_rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-sm">{activity.restaurant_rating}</span>
                </div>
              )}

              {activity.restaurant_michelin_stars && (
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{activity.restaurant_michelin_stars} Michelin Star{activity.restaurant_michelin_stars > 1 ? 's' : ''}</span>
                </div>
              )}

              {activity.notes && (
                <p className="text-sm text-foreground bg-muted/30 p-2 rounded">{activity.notes}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">{activity.restaurant_cuisine}</Badge>
                {activity.restaurant_price_range && (
                  <Badge variant="outline" className="text-xs">
                    {'$'.repeat(activity.restaurant_price_range)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        {activity.restaurant_photos.length > 1 && (
          <div className="px-4 pb-4">
            <div className="flex gap-2 overflow-x-auto">
              {activity.restaurant_photos.slice(1, 4).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${activity.restaurant_name} photo ${index + 2}`}
                  className="w-20 h-20 rounded object-cover flex-shrink-0"
                />
              ))}
              {activity.restaurant_photos.length > 4 && (
                <div className="w-20 h-20 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">+{activity.restaurant_photos.length - 4}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(activity.id, 'friend_activity')}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs">Like</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleComment(activity.id)}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Comment</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare(activity.id)}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAddToWishlist(activity)}
              className="flex items-center gap-1 text-muted-foreground hover:text-red-500"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/restaurant/${activity.restaurant_name}`)}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Friend Activity Footer */}
        <div className="px-4 pb-3">
          <p className="text-xs text-muted-foreground">
            3 friends have also rated this restaurant
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const renderExpertReviewCard = (review: ExpertReview) => (
    <Card key={review.id} className="overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.expert_avatar} />
            <AvatarFallback>{review.expert_name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{review.expert_name}</span>
              <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                {review.expert_badge}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {review.created_at && !isNaN(new Date(review.created_at).getTime()) 
                ? formatDistanceToNow(new Date(review.created_at), { addSuffix: true })
                : 'Recently'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-base">{review.restaurant_name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{review.restaurant_city}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-1 rounded-full">
                <Award className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-sm text-amber-700">Expert Score: {review.expert_score}</span>
              </div>
            </div>

            <p className="text-sm text-foreground leading-relaxed">{review.review_content}</p>

            {review.booking_link && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(review.booking_link, '_blank')}
                className="w-full"
              >
                Make Reservation
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs">Helpful</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Discuss</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <Share2 className="h-4 w-4" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        </div>

        {/* Expert carousel */}
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">More from this expert</p>
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-32 p-2 border rounded-lg">
                <div className="text-xs font-medium truncate">Restaurant {i}</div>
                <div className="text-xs text-muted-foreground">Score: 8.{i}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDiscoveryBlock = (block: DiscoveryBlock) => (
    <Card key={block.id} className="overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-semibold text-base">{block.title}</h3>
              <p className="text-sm text-muted-foreground">{block.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="grid gap-3">
            {block.restaurants.map((restaurant) => (
              <div key={restaurant.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <img
                  src={restaurant.photos[0] || '/placeholder.svg'}
                  alt={restaurant.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{restaurant.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{restaurant.city}</span>
                    <span>•</span>
                    <span>{restaurant.cuisine}</span>
                    {restaurant.price_range && (
                      <>
                        <span>•</span>
                        <span>{'$'.repeat(restaurant.price_range)}</span>
                      </>
                    )}
                  </div>
                  {restaurant.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{restaurant.rating}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddToWishlist(restaurant)}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderSuggestedFriendsRow = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="font-semibold text-sm">Suggested for You</h3>
        <Button variant="ghost" size="sm" className="text-xs">See All</Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {suggestedFriends.map((friend) => (
          <Card key={friend.id} className="flex-shrink-0 w-48 hover:shadow-md transition-all duration-300">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={friend.avatar} />
                  <AvatarFallback>{friend.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{friend.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ChefHat className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{friend.top_cuisine}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{friend.city}</span>
                  </div>
                  {friend.mutual_friends > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Followed by {friend.mutual_friends} mutual{friend.mutual_friends > 1 ? ' friends' : ' friend'}
                    </p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleFollow(friend.id)}
                className="w-full mt-3 bg-primary hover:bg-primary/90"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Follow
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Tabs */}
        <div className="px-4 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
              <TabsTrigger value="friends" className="text-sm">Friends</TabsTrigger>
              <TabsTrigger value="experts" className="text-sm">Experts</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, restaurants, or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>

          {/* Quick Filters Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1"
            >
              <Filter className="h-3 w-3" />
              Filters
            </Button>
            
            <div className="flex items-center gap-2 text-sm">
              <Switch
                checked={openNowFilter}
                onCheckedChange={setOpenNowFilter}
                className="scale-75"
              />
              <span className="text-xs text-muted-foreground">Open Now</span>
            </div>
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2 animate-fade-in">
              <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Cuisine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cuisines</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="american">American</SelectItem>
                </SelectContent>
              </Select>

              <Select value={cityFilter} onValueChange={setCityFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Cities</SelectItem>
                  <SelectItem value="nyc">New York</SelectItem>
                  <SelectItem value="sf">San Francisco</SelectItem>
                  <SelectItem value="la">Los Angeles</SelectItem>
                  <SelectItem value="chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Prices</SelectItem>
                  <SelectItem value="1">$ - Budget</SelectItem>
                  <SelectItem value="2">$$ - Moderate</SelectItem>
                  <SelectItem value="3">$$$ - Expensive</SelectItem>
                  <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Main Feed Content */}
      <div ref={feedRef} className="px-4 pt-4 pb-20 space-y-4">
        {/* Friend Suggestions Row */}
        {activeTab === 'all' && renderSuggestedFriendsRow()}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <FriendCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Feed Items */}
            <div className="space-y-4">
              {feedData.map((item, index) => {
                if (item.type === 'friend_activity') {
                  return renderFriendActivityCard(item as FriendActivity);
                } else if (item.type === 'expert_review') {
                  return renderExpertReviewCard(item as ExpertReview);
                } else if (item.type === 'discovery_block') {
                  return renderDiscoveryBlock(item as DiscoveryBlock);
                }
                return null;
              })}

              {/* Date Separators */}
              {feedData.length > 10 && (
                <div className="flex items-center gap-3 py-4">
                  <div className="flex-1 h-px bg-border"></div>
                  <span className="text-xs text-muted-foreground bg-background px-3">Yesterday</span>
                  <div className="flex-1 h-px bg-border"></div>
                </div>
              )}
            </div>

            {/* Infinite Scroll Loader */}
            <InfiniteScrollLoader
              hasMore={hasMore}
              isLoading={isLoadingMore}
              onLoadMore={loadMoreContent}
              loadMoreText="Load More Posts"
            />

            {/* Empty State */}
            {feedData.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold text-lg mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'friends' 
                    ? "Follow friends to see their restaurant activity here"
                    : activeTab === 'experts'
                    ? "Expert reviews will appear here"
                    : "Your personalized feed will appear here"
                  }
                </p>
                <Button onClick={() => navigate('/friends')}>
                  Find Friends
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
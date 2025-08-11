import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Heart, 
  MessageCircle, 
  Share2, 
  Star, 
  MapPin, 
  Clock, 
  Plus,
  ChefHat,
  Award,
  TrendingUp,
  Users,
  ThumbsUp,
  Bookmark,
  MoreHorizontal,
  Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRestaurants } from '@/hooks/useFriendRestaurants';
import { formatDistanceToNow } from 'date-fns';

interface FeedActivity {
  id: string;
  type: 'rating' | 'wishlist' | 'expert_review' | 'recommendation';
  user: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
    is_expert?: boolean;
  };
  restaurant: {
    name: string;
    city: string;
    cuisine: string;
    price_range?: string;
    michelin_stars?: number;
    image_url?: string;
  };
  rating?: number;
  review?: string;
  timestamp: string;
  likes_count?: number;
  comments_count?: number;
  mutual_friends_count?: number;
}

export default function MobileFeedPage() {
  const { user, profile } = useAuth();
  const { friends, searchUsers } = useFriends();
  const { fetchAllFriendsRestaurants } = useFriendRestaurants();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [feedActivities, setFeedActivities] = useState<FeedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Quick filters state
  const [filters, setFilters] = useState({
    cuisine: '',
    city: '',
    priceRange: '',
    datePosted: '',
    openNow: false
  });

  useEffect(() => {
    loadFeedData();
    loadFriendSuggestions();
  }, [activeTab]);

  const loadFeedData = async () => {
    setIsLoading(true);
    try {
      const { activities } = await fetchAllFriendsRestaurants(0, 20);
      
      // Transform the data to match our feed format
      const transformedActivities: FeedActivity[] = activities.map((activity: any) => ({
        id: activity.id || Math.random().toString(),
        type: activity.is_wishlist ? 'wishlist' : 'rating',
        user: {
          id: activity.friend_id,
          username: activity.friend_username,
          name: activity.friend_name || activity.friend_username,
          avatar_url: activity.friend_avatar_url,
          is_expert: activity.friend_is_expert || false
        },
        restaurant: {
          name: activity.restaurant_name,
          city: activity.city,
          cuisine: activity.cuisine,
          price_range: activity.price_range,
          michelin_stars: activity.michelin_stars,
          image_url: activity.image_url
        },
        rating: activity.rating,
        review: activity.review,
        timestamp: activity.updated_at || activity.created_at,
        likes_count: Math.floor(Math.random() * 10), // Mock data
        comments_count: Math.floor(Math.random() * 5), // Mock data
        mutual_friends_count: Math.floor(Math.random() * 3) // Mock data
      }));

      setFeedActivities(transformedActivities);
    } catch (error) {
      console.error('Error loading feed data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFriendSuggestions = async () => {
    // Mock friend suggestions - in real app, this would come from an API
    const mockSuggestions = [
      {
        id: '1',
        username: 'foodie_sarah',
        name: 'Sarah Chen',
        avatar_url: null,
        top_cuisine: 'Japanese',
        city: 'San Francisco',
        mutual_friends: 3
      },
      {
        id: '2',
        username: 'chef_marco',
        name: 'Marco Rodriguez',
        avatar_url: null,
        top_cuisine: 'Italian',
        city: 'New York',
        mutual_friends: 1
      }
    ];
    setSuggestions(mockSuggestions);
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderFriendSuggestions = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">Suggested for you</h3>
        <Button variant="ghost" size="sm" className="text-xs text-primary">
          See All
        </Button>
      </div>
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {suggestions.map((suggestion) => (
          <Card key={suggestion.id} className="flex-shrink-0 w-40 bg-card/50 border-border/50">
            <CardContent className="p-3">
              <div className="text-center space-y-2">
                <Avatar className="h-12 w-12 mx-auto">
                  <AvatarImage src={suggestion.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(suggestion.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-xs text-foreground truncate">{suggestion.name}</p>
                  <p className="text-xs text-muted-foreground">@{suggestion.username}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>{suggestion.top_cuisine} • {suggestion.city}</p>
                  <p>Followed by {suggestion.mutual_friends} friends</p>
                </div>
                <Button size="sm" className="w-full text-xs">
                  Follow
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderActivityCard = (activity: FeedActivity) => (
    <Card key={activity.id} className="mb-4 bg-card/50 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={activity.user.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {getInitials(activity.user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-1">
                <p className="font-medium text-sm text-foreground">{activity.user.name}</p>
                {activity.user.is_expert && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    <Award className="h-3 w-3 mr-1" />
                    Expert
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {activity.type === 'rating' ? 'rated' : 'added to wishlist'} • {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Restaurant Info */}
          <div className="flex items-start space-x-3">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              {activity.restaurant.image_url ? (
                <img 
                  src={activity.restaurant.image_url} 
                  alt={activity.restaurant.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <ChefHat className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground">{activity.restaurant.name}</h4>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{activity.restaurant.cuisine}</span>
                <span>•</span>
                <span className="flex items-center">
                  <MapPin className="h-3 w-3 mr-1" />
                  {activity.restaurant.city}
                </span>
                {activity.restaurant.price_range && (
                  <>
                    <span>•</span>
                    <span>{activity.restaurant.price_range}</span>
                  </>
                )}
              </div>
              {activity.restaurant.michelin_stars && (
                <div className="flex items-center mt-1">
                  {[...Array(activity.restaurant.michelin_stars)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">Michelin</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating & Review */}
          {activity.rating && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${
                      i < activity.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <span className="font-medium text-sm">{activity.rating}/5</span>
            </div>
          )}

          {activity.review && (
            <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">
              {activity.review}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {activity.restaurant.cuisine}
            </Badge>
            {activity.restaurant.price_range && (
              <Badge variant="outline" className="text-xs">
                {activity.restaurant.price_range}
              </Badge>
            )}
            {activity.restaurant.michelin_stars && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                Michelin Star
              </Badge>
            )}
          </div>

          {/* Mutual Friends */}
          {activity.mutual_friends_count && activity.mutual_friends_count > 0 && (
            <p className="text-xs text-muted-foreground">
              <Users className="h-3 w-3 inline mr-1" />
              {activity.mutual_friends_count} friends have also rated this
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <ThumbsUp className="h-4 w-4 mr-1" />
                {activity.likes_count || 0}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <MessageCircle className="h-4 w-4 mr-1" />
                {activity.comments_count || 0}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                View Restaurant
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">Feed</h1>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, restaurants, or users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="friends" className="text-xs">Friends</TabsTrigger>
              <TabsTrigger value="experts" className="text-xs">Experts</TabsTrigger>
              <TabsTrigger value="foryou" className="text-xs">For You</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Quick Filters */}
          {showFilters && (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="text-xs">Cuisine</Button>
                <Button variant="outline" size="sm" className="text-xs">City</Button>
                <Button variant="outline" size="sm" className="text-xs">Price Range</Button>
                <Button variant="outline" size="sm" className="text-xs">Date Posted</Button>
                <Button variant="outline" size="sm" className="text-xs">Open Now</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} className="w-full">
          <TabsContent value="all" className="mt-0">
            {renderFriendSuggestions()}
            
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-muted rounded-full"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-3 bg-muted rounded w-1/3"></div>
                            <div className="h-2 bg-muted rounded w-1/4"></div>
                          </div>
                        </div>
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : feedActivities.length > 0 ? (
              <div>
                {feedActivities.map(renderActivityCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">No activity yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Follow friends to see their restaurant activity here
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Find Friends
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-0">
            {renderFriendSuggestions()}
            {feedActivities.length > 0 ? (
              <div>
                {feedActivities.map(renderActivityCard)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-2">No friend activity</h3>
                <p className="text-sm text-muted-foreground">
                  Your friends haven't shared any restaurant activity yet
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="experts" className="mt-0">
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">Expert Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Expert restaurant reviews and recommendations will appear here
              </p>
            </div>
          </TabsContent>

          <TabsContent value="foryou" className="mt-0">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">Personalized Feed</h3>
              <p className="text-sm text-muted-foreground">
                AI-curated recommendations based on your preferences will appear here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
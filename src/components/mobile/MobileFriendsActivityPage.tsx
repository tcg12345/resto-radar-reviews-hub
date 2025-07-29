import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, MapPin, Star, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FriendFilter {
  cuisine: string;
  priceRange: string;
  rating: number[];
  location: string;
  activityType: 'all' | 'recent' | 'rated' | 'wishlist';
}

const CUISINES = [
  "Italian", "Japanese", "French", "Chinese", "Mexican", "Indian", 
  "Thai", "Mediterranean", "American", "Korean", "Vietnamese", "Spanish"
];

export function MobileFriendsActivityPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [friendActivities, setFriendActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'activity'>('friends');
  const [filters, setFilters] = useState<FriendFilter>({
    cuisine: '',
    priceRange: '',
    rating: [0],
    location: '',
    activityType: 'all'
  });

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchFriendActivities();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_friends_with_scores', { requesting_user_id: user.id });

      if (error) {
        console.error('Error fetching friends:', error);
        toast('Failed to load friends');
        return;
      }

      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast('Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFriendActivities = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          profiles!inner(id, username, name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching friend activities:', error);
        return;
      }

      // Filter to only show activities from friends
      const friendIds = friends.map(f => f.friend_id);
      const friendActivitiesData = data?.filter(activity => 
        friendIds.includes(activity.user_id) && activity.user_id !== user.id
      ) || [];

      setFriendActivities(friendActivitiesData);
    } catch (error) {
      console.error('Error fetching friend activities:', error);
    }
  };

  const filteredFriends = friends.filter(friend => {
    const matchesSearch = friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         friend.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredActivities = friendActivities.filter(activity => {
    let matches = true;

    if (searchQuery) {
      matches = matches && (
        activity.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.cuisine) {
      matches = matches && activity.cuisine === filters.cuisine;
    }

    if (filters.priceRange) {
      matches = matches && activity.price_range === filters.priceRange;
    }

    if (filters.rating[0] > 0) {
      matches = matches && activity.rating >= filters.rating[0];
    }

    if (filters.location) {
      matches = matches && (
        activity.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
        activity.country?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.activityType !== 'all') {
      switch (filters.activityType) {
        case 'recent':
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          matches = matches && new Date(activity.created_at) >= oneWeekAgo;
          break;
        case 'rated':
          matches = matches && !activity.is_wishlist;
          break;
        case 'wishlist':
          matches = matches && activity.is_wishlist;
          break;
      }
    }

    return matches;
  });

  const clearFilters = () => {
    setFilters({
      cuisine: '',
      priceRange: '',
      rating: [0],
      location: '',
      activityType: 'all'
    });
  };

  const hasActiveFilters = filters.cuisine || filters.priceRange || filters.rating[0] > 0 || 
                          filters.location || filters.activityType !== 'all';

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Search Header */}
      <div className="p-4 space-y-3 border-b">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'friends' ? "Search friends..." : "Search friend activities..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-10 text-base"
          />
        </div>

        {/* Filter Button Row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 relative">
                  <Filter className="h-4 w-4 mr-1" />
                  Filters
                  {hasActiveFilters && (
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Filter Friends & Activities</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-4 p-1">
                    <div>
                      <Label className="text-sm font-medium">Activity Type</Label>
                      <Select 
                        value={filters.activityType} 
                        onValueChange={(value: any) => setFilters(prev => ({ ...prev, activityType: value }))}
                      >
                        <SelectTrigger className="h-10 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Activities</SelectItem>
                          <SelectItem value="recent">Recent (Last Week)</SelectItem>
                          <SelectItem value="rated">Rated Places</SelectItem>
                          <SelectItem value="wishlist">Wishlist Items</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Cuisine</Label>
                      <Select 
                        value={filters.cuisine} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, cuisine: value }))}
                      >
                        <SelectTrigger className="h-10 mt-1">
                          <SelectValue placeholder="Any cuisine" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any cuisine</SelectItem>
                          {CUISINES.map(cuisine => (
                            <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Price Range</Label>
                      <Select 
                        value={filters.priceRange} 
                        onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                      >
                        <SelectTrigger className="h-10 mt-1">
                          <SelectValue placeholder="Any price" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any price</SelectItem>
                          <SelectItem value="$">$ - Budget</SelectItem>
                          <SelectItem value="$$">$$ - Moderate</SelectItem>
                          <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                          <SelectItem value="$$$$">$$$$ - Very Expensive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Minimum Rating: {filters.rating[0]}/5</Label>
                      <Slider
                        value={filters.rating}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
                        max={5}
                        min={0}
                        step={0.5}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Location</Label>
                      <Input
                        placeholder="City or country"
                        value={filters.location}
                        onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                        className="h-10 mt-1"
                      />
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={clearFilters} className="flex-1">
                    Clear All
                  </Button>
                  <Button onClick={() => setIsFilterOpen(false)} className="flex-1">
                    Apply Filters
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-9 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {activeTab === 'friends' ? `${filteredFriends.length} friends` : `${filteredActivities.length} activities`}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 py-2">
        <div className="flex bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'friends'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Friends
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'activity'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            Activity
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {activeTab === 'friends' ? (
            <>
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No friends found matching your search' : 'No friends yet'}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div 
                    key={friend.friend_id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98] border-t border-b border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback>
                          {(friend.name || friend.username || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{friend.name}</h3>
                        <p className="text-sm text-muted-foreground truncate">@{friend.username}</p>
                        {friend.compatibility_score && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(friend.compatibility_score)}% compatible
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                        View Profile
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery || hasActiveFilters ? 'No activities found matching your criteria' : 'No friend activities yet'}
                  </p>
                </div>
              ) : (
                filteredActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98] border-t border-b border-border p-4"
                  >
                    <div className="flex gap-3">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={activity.profiles?.avatar_url} />
                        <AvatarFallback>
                          {(activity.profiles?.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{activity.profiles?.name}</span>
                              {activity.is_wishlist ? ' added to wishlist' : ' visited'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.created_at)}
                            </p>
                          </div>
                          
                          {activity.is_wishlist && (
                            <Badge variant="secondary" className="text-xs ml-2">
                              Wishlist
                            </Badge>
                          )}
                        </div>
                        
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm truncate">{activity.name}</h4>
                            {activity.rating && !activity.is_wishlist && (
                              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span className="text-xs">{activity.rating}/5</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {activity.cuisine && (
                              <Badge variant="outline" className="text-xs">
                                {activity.cuisine}
                              </Badge>
                            )}
                            {activity.price_range && (
                              <span className="font-medium">{activity.price_range}</span>
                            )}
                          </div>
                          
                          {activity.city && (
                            <div className="flex items-center gap-1 mt-2">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground truncate">
                                {activity.city}, {activity.country}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
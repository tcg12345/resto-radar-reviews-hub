import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Filter, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FeedItemCard } from '@/components/FeedItemCard';
import { HorizontalFilterChips } from '@/components/HorizontalFilterChips';
import { ProfileCarousel } from '@/components/ProfileCarousel';
import { InfiniteScrollLoader } from '@/components/InfiniteScrollLoader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FeedItem, FilterChip, ProfilePreview } from '@/types/feed';
import { PopularRestaurantsCarousel } from '@/components/PopularRestaurantsCarousel';

export default function FeedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedItem[]>([]);
  const [filters, setFilters] = useState<FilterChip[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfilePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Load feed data
  const loadFeedData = useCallback(async (isRefresh = false, loadOffset = 0) => {
    if (!user) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else if (loadOffset === 0) {
        setIsLoading(true);
      }

      const limit = 20;

      // Get user's friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const friendIds = friendsData?.map(f => 
        f.user1_id === user.id ? f.user2_id : f.user1_id
      ) || [];

      // Get expert users
      const { data: expertRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert');

      const expertIds = expertRoles?.map(r => r.user_id) || [];

      let allFeedItems: FeedItem[] = [];

      // Fetch friend activity if we have friends
      if (friendIds.length > 0) {
        // Friend restaurant ratings
        const { data: friendRatings } = await supabase
          .from('restaurants')
          .select(`
            id, user_id, name, address, city, country, cuisine, rating, price_range, michelin_stars, notes, photos, photo_captions, photo_dish_names, created_at, date_visited, google_place_id, website, phone_number, latitude, longitude
          `)
          .in('user_id', friendIds)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .order('created_at', { ascending: false })
          .range(loadOffset, loadOffset + limit - 1);

        // Get profiles separately
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', friendIds);

        const profileMap = new Map(friendProfiles?.map(p => [p.id, p]) || []);

        // Friend reviews
        const { data: friendReviews } = await supabase
          .from('user_reviews')
          .select('id, user_id, restaurant_name, restaurant_address, overall_rating, review_text, photos, photo_captions, photo_dish_names, created_at, restaurant_place_id, category_ratings')
          .in('user_id', friendIds)
          .order('created_at', { ascending: false })
          .range(loadOffset, loadOffset + limit - 1);

        // Transform friend data
        const friendRatingItems: FeedItem[] = (friendRatings || []).map(r => {
          const profile = profileMap.get(r.user_id);
          return {
            id: `friend-rating-${r.id}`,
            type: 'friend-rating' as const,
            user_id: r.user_id,
            username: profile?.username,
            name: profile?.name,
            avatar_url: profile?.avatar_url,
            restaurant_name: r.name,
            restaurant_address: r.address,
            city: r.city,
            country: r.country,
            cuisine: r.cuisine,
            rating: r.rating,
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            notes: r.notes,
            photos: r.photos,
            photo_captions: r.photo_captions,
            photo_dish_names: r.photo_dish_names,
            created_at: r.created_at,
            date_visited: r.date_visited,
            google_place_id: r.google_place_id,
            website: r.website,
            phone_number: r.phone_number,
            latitude: r.latitude,
            longitude: r.longitude
          };
        });

        const friendReviewItems: FeedItem[] = (friendReviews || []).map(r => {
          const profile = profileMap.get(r.user_id);
          const categoryRatings = r.category_ratings as any;
          return {
            id: `friend-review-${r.id}`,
            type: 'friend-review' as const,
            user_id: r.user_id,
            username: profile?.username,
            name: profile?.name,
            avatar_url: profile?.avatar_url,
            restaurant_name: r.restaurant_name,
            restaurant_address: r.restaurant_address,
            cuisine: categoryRatings?.cuisine,
            overall_rating: r.overall_rating,
            review_text: r.review_text,
            photos: r.photos,
            photo_captions: r.photo_captions,
            photo_dish_names: r.photo_dish_names,
            created_at: r.created_at,
            place_id: r.restaurant_place_id
          };
        });

        allFeedItems.push(...friendRatingItems, ...friendReviewItems);
      }

      // Fetch expert activity
      if (expertIds.length > 0) {
        // Expert restaurant ratings
        const { data: expertRatings } = await supabase
          .from('restaurants')
          .select(`
            id, user_id, name, address, city, country, cuisine, rating, price_range, michelin_stars, notes, photos, photo_captions, photo_dish_names, created_at, date_visited, google_place_id, website, phone_number, latitude, longitude
          `)
          .in('user_id', expertIds)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .order('created_at', { ascending: false })
          .range(loadOffset, loadOffset + limit - 1);

        // Get expert profiles separately
        const { data: expertProfiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .in('id', expertIds);

        const expertProfileMap = new Map(expertProfiles?.map(p => [p.id, p]) || []);

        // Expert reviews
        const { data: expertReviews } = await supabase
          .from('user_reviews')
          .select('id, user_id, restaurant_name, restaurant_address, overall_rating, review_text, photos, photo_captions, photo_dish_names, created_at, restaurant_place_id, category_ratings')
          .in('user_id', expertIds)
          .order('created_at', { ascending: false })
          .range(loadOffset, loadOffset + limit - 1);

        // Transform expert data
        const expertRatingItems: FeedItem[] = (expertRatings || []).map(r => {
          const profile = expertProfileMap.get(r.user_id);
          return {
            id: `expert-rating-${r.id}`,
            type: 'expert-rating' as const,
            user_id: r.user_id,
            username: profile?.username,
            name: profile?.name,
            avatar_url: profile?.avatar_url,
            restaurant_name: r.name,
            restaurant_address: r.address,
            city: r.city,
            country: r.country,
            cuisine: r.cuisine,
            rating: r.rating,
            price_range: r.price_range,
            michelin_stars: r.michelin_stars,
            notes: r.notes,
            photos: r.photos,
            photo_captions: r.photo_captions,
            photo_dish_names: r.photo_dish_names,
            created_at: r.created_at,
            date_visited: r.date_visited,
            google_place_id: r.google_place_id,
            website: r.website,
            phone_number: r.phone_number,
            latitude: r.latitude,
            longitude: r.longitude
          };
        });

        const expertReviewItems: FeedItem[] = (expertReviews || []).map(r => {
          const profile = expertProfileMap.get(r.user_id);
          const categoryRatings = r.category_ratings as any;
          return {
            id: `expert-review-${r.id}`,
            type: 'expert-review' as const,
            user_id: r.user_id,
            username: profile?.username,
            name: profile?.name,
            avatar_url: profile?.avatar_url,
            restaurant_name: r.restaurant_name,
            restaurant_address: r.restaurant_address,
            cuisine: categoryRatings?.cuisine,
            overall_rating: r.overall_rating,
            review_text: r.review_text,
            photos: r.photos,
            photo_captions: r.photo_captions,
            photo_dish_names: r.photo_dish_names,
            created_at: r.created_at,
            place_id: r.restaurant_place_id
          };
        });

        allFeedItems.push(...expertRatingItems, ...expertReviewItems);
      }

      // Sort by date and deduplicate
      allFeedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Remove duplicates based on id
      const uniqueItems = allFeedItems.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

      if (isRefresh || loadOffset === 0) {
        setFeedItems(uniqueItems);
      } else {
        setFeedItems(prev => [...prev, ...uniqueItems]);
      }

      setHasMore(uniqueItems.length === limit);
      setOffset(loadOffset + uniqueItems.length);

      // Generate filters from the data
      if (isRefresh || loadOffset === 0) {
        generateFilters(uniqueItems);
      }

      // Load profile previews
      if (isRefresh || loadOffset === 0) {
        await loadProfilePreviews([...friendIds, ...expertIds]);
      }

    } catch (error) {
      console.error('Error loading feed:', error);
      toast.error('Failed to load feed');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Generate filter chips from feed data
  const generateFilters = (items: FeedItem[]) => {
    const cuisineCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};
    const ratingCounts = { high: 0, medium: 0, low: 0 };
    const priceCounts = { expensive: 0, moderate: 0, affordable: 0 };

    items.forEach(item => {
      if (item.cuisine) {
        cuisineCounts[item.cuisine] = (cuisineCounts[item.cuisine] || 0) + 1;
      }
      if (item.city) {
        cityCounts[item.city] = (cityCounts[item.city] || 0) + 1;
      }
      
      const rating = item.overall_rating || item.rating;
      if (rating) {
        if (rating >= 8) ratingCounts.high++;
        else if (rating >= 6) ratingCounts.medium++;
        else ratingCounts.low++;
      }

      if (item.price_range) {
        if (item.price_range >= 3) priceCounts.expensive++;
        else if (item.price_range === 2) priceCounts.moderate++;
        else priceCounts.affordable++;
      }
    });

    const newFilters: FilterChip[] = [
      // Top cuisines
      ...Object.entries(cuisineCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([cuisine, count]) => ({
          id: `cuisine-${cuisine}`,
          label: cuisine,
          type: 'cuisine' as const,
          value: cuisine,
          count
        })),
      
      // Top cities
      ...Object.entries(cityCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([city, count]) => ({
          id: `city-${city}`,
          label: city,
          type: 'city' as const,
          value: city,
          count
        })),

      // Rating filters
      { id: 'rating-high', label: 'Highly Rated (8+)', type: 'rating' as const, value: 'high', count: ratingCounts.high },
      { id: 'rating-medium', label: 'Good (6-8)', type: 'rating' as const, value: 'medium', count: ratingCounts.medium },

      // Price filters
      { id: 'price-expensive', label: 'Fine Dining ($$$+)', type: 'price' as const, value: 'expensive', count: priceCounts.expensive },
      { id: 'price-affordable', label: 'Budget Friendly ($)', type: 'price' as const, value: 'affordable', count: priceCounts.affordable }
    ].filter(f => f.count > 0);

    setFilters(newFilters);
  };

  // Load profile previews
  const loadProfilePreviews = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, name, avatar_url')
        .in('id', userIds.slice(0, 10)); // Limit to 10 for performance

      if (profilesData) {
        const expertStatuses = await checkExpertStatus(userIds);
        
        const profilePreviews: ProfilePreview[] = profilesData.map(profile => ({
          id: profile.id,
          username: profile.username || '',
          name: profile.name,
          avatar_url: profile.avatar_url,
          isExpert: expertStatuses[profile.id] || false,
          recentActivityCount: feedItems.filter(item => item.user_id === profile.id).length
        }));

        // Sort experts first, then by activity count
        profilePreviews.sort((a, b) => {
          if (a.isExpert !== b.isExpert) return a.isExpert ? -1 : 1;
          return b.recentActivityCount - a.recentActivityCount;
        });

        setProfiles(profilePreviews);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  // Filter feed items
  useEffect(() => {
    if (selectedFilters.length === 0) {
      setFilteredItems(feedItems);
      return;
    }

    const filtered = feedItems.filter(item => {
      return selectedFilters.every(filterId => {
        const filter = filters.find(f => f.id === filterId);
        if (!filter) return true;

        switch (filter.type) {
          case 'cuisine':
            return item.cuisine === filter.value;
          case 'city':
            return item.city === filter.value;
          case 'rating':
            const rating = item.overall_rating || item.rating;
            if (!rating) return false;
            if (filter.value === 'high') return rating >= 8;
            if (filter.value === 'medium') return rating >= 6 && rating < 8;
            if (filter.value === 'low') return rating < 6;
            return true;
          case 'price':
            if (!item.price_range) return false;
            if (filter.value === 'expensive') return item.price_range >= 3;
            if (filter.value === 'moderate') return item.price_range === 2;
            if (filter.value === 'affordable') return item.price_range === 1;
            return true;
          default:
            return true;
        }
      });
    });

    setFilteredItems(filtered);
  }, [feedItems, selectedFilters, filters]);

  // Initial load
  useEffect(() => {
    loadFeedData();
  }, [loadFeedData]);

  const handleRefresh = () => {
    setOffset(0);
    loadFeedData(true, 0);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadFeedData(false, offset);
    }
  };

  const handleFilterToggle = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleClearFilters = () => {
    setSelectedFilters([]);
  };

  if (isLoading && feedItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isLoading && filteredItems.length === 0 && feedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
        <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your Feed is Empty</h2>
        <p className="text-muted-foreground text-center mb-6">
          Follow friends and experts to see their restaurant discoveries and reviews here.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/friends')}>
            Find Friends
          </Button>
          <Button variant="outline" onClick={() => navigate('/search/experts')}>
            Discover Experts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Feed</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Popular Restaurants Carousel */}
      <PopularRestaurantsCarousel />

      {/* Profile Carousel */}
      {profiles.length > 0 && (
        <ProfileCarousel
          profiles={profiles}
          title="Active Today"
        />
      )}

      {/* Filter Chips */}
      <HorizontalFilterChips
        filters={filters}
        selectedFilters={selectedFilters}
        onFilterToggle={handleFilterToggle}
        onClearAll={handleClearFilters}
      />

      {/* Feed Content */}
      <ScrollArea className="flex-1">
        <div className="pb-20">
          {filteredItems.map((item) => (
            <FeedItemCard
              key={item.id}
              item={item}
            />
          ))}
          
          <InfiniteScrollLoader
            hasMore={hasMore}
            isLoading={isLoading}
            onLoadMore={handleLoadMore}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
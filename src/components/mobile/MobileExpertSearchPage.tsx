import React, { useState, useEffect } from 'react';
import { Search, Filter, Star, MapPin, X, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BottomSheet, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MichelinStars } from '@/components/MichelinStars';

interface ExpertFilter {
  cuisine: string;
  priceRange: string;
  rating: number[];
  location: string;
}

const CUISINES = [
  "Italian", "Japanese", "French", "Chinese", "Mexican", "Indian", 
  "Thai", "Mediterranean", "American", "Korean", "Vietnamese", "Spanish"
];

export function MobileExpertSearchPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [expertReviews, setExpertReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ExpertFilter>({
    cuisine: 'all',
    priceRange: 'all',
    rating: [0],
    location: ''
  });

  useEffect(() => {
    if (user) {
      fetchExpertReviews();
    }
  }, [user]);

  const fetchExpertReviews = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get all expert user IDs first
      const { data: expertIds, error: expertIdsError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'expert');

      if (expertIdsError) {
        console.error('Error fetching expert IDs:', expertIdsError);
        toast('Failed to load expert IDs');
        return;
      }

      const expertUserIds = expertIds?.map(role => role.user_id) || [];

      if (expertUserIds.length === 0) {
        setExpertReviews([]);
        return;
      }

      // Get expert reviews from user_reviews table
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('user_reviews')
        .select(`
          *,
          profiles(id, username, name, avatar_url)
        `)
        .in('user_id', expertUserIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (reviewsError) {
        console.error('Error fetching expert reviews:', reviewsError);
        toast('Failed to load expert reviews');
        return;
      }

      // Get expert ratings from restaurants table
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          cuisine,
          rating,
          address,
          city,
          country,
          price_range,
          michelin_stars,
          created_at,
          date_visited,
          notes,
          photos,
          user_id,
          profiles(id, username, name, avatar_url)
        `)
        .in('user_id', expertUserIds)
        .eq('is_wishlist', false)
        .not('rating', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ratingsError) {
        console.error('Error fetching expert ratings:', ratingsError);
        toast('Failed to load expert ratings');
        return;
      }

      // Combine all expert content
      const allExpertContent = [
        ...(reviewsData || []).map(review => ({
          ...review,
          type: 'review',
          restaurant_name: review.restaurant_name,
          restaurant_address: review.restaurant_address,
          overall_rating: review.overall_rating,
          review_text: review.review_text
        })),
        ...(ratingsData || []).map(rating => ({
          ...rating,
          type: 'rating',
          restaurant_name: rating.name,
          restaurant_address: rating.address,
          overall_rating: rating.rating,
          review_text: rating.notes
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setExpertReviews(allExpertContent);
    } catch (error) {
      console.error('Error fetching expert reviews:', error);
      toast('Failed to load expert reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReviews = expertReviews.filter(review => {
    let matches = true;

    if (searchQuery) {
      matches = matches && (
        review.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.cuisine?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.cuisine && filters.cuisine !== 'all') {
      matches = matches && review.cuisine === filters.cuisine;
    }

    if (filters.priceRange && filters.priceRange !== 'all') {
      matches = matches && review.price_range?.toString() === filters.priceRange;
    }

    if (filters.rating[0] > 0) {
      matches = matches && review.overall_rating >= filters.rating[0];
    }

    if (filters.location) {
      matches = matches && (
        review.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
        review.country?.toLowerCase().includes(filters.location.toLowerCase()) ||
        review.restaurant_address?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    return matches;
  });

  const clearFilters = () => {
    setFilters({
      cuisine: 'all',
      priceRange: 'all',
      rating: [0],
      location: ''
    });
  };

  const hasActiveFilters = filters.cuisine && filters.cuisine !== 'all' || 
                          filters.priceRange && filters.priceRange !== 'all' || 
                          filters.rating[0] > 0 || 
                          filters.location;

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

  const getPriceDisplay = (priceRange: number) => {
    switch (priceRange) {
      case 1: return '$';
      case 2: return '$$';
      case 3: return '$$$';
      case 4: return '$$$$';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading expert reviews...</div>
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
            placeholder="Search expert reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-10 text-base"
          />
        </div>

        {/* Filter Button Row */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 px-3 relative"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {hasActiveFilters && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
              )}
            </Button>

            <BottomSheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <BottomSheetHeader>
                <h2 className="text-lg font-semibold">Filter Expert Reviews</h2>
              </BottomSheetHeader>
              
              <BottomSheetContent>
                <div className="space-y-4">
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
                        <SelectItem value="all">Any cuisine</SelectItem>
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
                        <SelectItem value="all">Any price</SelectItem>
                        <SelectItem value="1">$ - Budget</SelectItem>
                        <SelectItem value="2">$$ - Moderate</SelectItem>
                        <SelectItem value="3">$$$ - Expensive</SelectItem>
                        <SelectItem value="4">$$$$ - Very Expensive</SelectItem>
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

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={clearFilters} className="flex-1">
                      Clear All
                    </Button>
                    <Button onClick={() => setIsFilterOpen(false)} className="flex-1">
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </BottomSheetContent>
            </BottomSheet>

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
            {filteredReviews.length} expert reviews
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-0">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || hasActiveFilters ? 'No expert reviews found matching your criteria' : 'No expert reviews yet'}
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div 
                key={`${review.type}-${review.id}`}
                className="cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98] border-b border-border p-4"
              >
                <div className="space-y-3">
                  {/* Expert Header */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={review.profiles?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary-glow/20">
                        {(review.profiles?.name || 'E').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{review.profiles?.name}</span>
                        <Crown className="h-4 w-4 text-primary fill-primary/20" />
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                          Expert
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">@{review.profiles?.username}</p>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {formatTimeAgo(review.created_at)}
                    </div>
                  </div>

                  {/* Restaurant Info */}
                  <div className="ml-13">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{review.restaurant_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">
                            {review.city && review.country ? `${review.city}, ${review.country}` : review.restaurant_address}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {review.overall_rating && (
                          <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-full">
                            <Star className="h-3 w-3 text-primary fill-primary" />
                            <span className="text-xs font-medium text-primary">
                              {review.overall_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {review.price_range && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {getPriceDisplay(review.price_range)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="flex items-center gap-3 mt-2">
                      {review.cuisine && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {review.cuisine}
                        </Badge>
                      )}
                      {review.michelin_stars > 0 && (
                        <MichelinStars stars={review.michelin_stars} size="sm" />
                      )}
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm leading-relaxed text-foreground/90">
                          {review.review_text}
                        </p>
                      </div>
                    )}

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="mt-3">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {review.photos.slice(0, 3).map((photo: string, index: number) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Photo ${index + 1}`}
                              className="h-16 w-16 object-cover rounded-lg flex-shrink-0"
                            />
                          ))}
                          {review.photos.length > 3 && (
                            <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-muted-foreground">+{review.photos.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
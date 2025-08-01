import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CategoryRating } from '@/types/restaurant';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CommunityStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  recentPhotos: Array<{
    review_id: string;
    user_id: string;
    username: string;
    photos: string[];
    captions: string[];
    dish_names: string[];
    created_at: string;
    helpful_count: number;
  }>;
}

export interface UserReview {
  reviewId: string;
  userId: string;
  username: string;
  overallRating: number;
  categoryRatings?: Record<string, number>;
  reviewText?: string;
  photos: string[];
  photoCaptions: string[];
  photoDishNames: string[];
  helpfulCount: number;
  createdAt: string;
  userFoundHelpful: boolean;
}

export function useRestaurantReviews(restaurantPlaceId?: string, restaurantName?: string) {
  const { user } = useAuth();
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchCommunityStats = async () => {
    if (!restaurantPlaceId && !restaurantName) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the optimized edge function directly - no fallbacks for speed
      const { data: communityData, error: communityError } = await supabase.functions.invoke('community-reviews', {
        body: {
          place_id: restaurantPlaceId,
          restaurant_name: restaurantName
        }
      });

      if (communityError) {
        console.error('Community function error:', communityError);
        setCommunityStats({
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
          recentPhotos: []
        });
        setIsLoading(false);
        return;
      }

      if (communityData) {
        setCommunityStats({
          averageRating: communityData.average_rating,
          totalReviews: communityData.total_reviews,
          ratingDistribution: communityData.rating_distribution,
          recentPhotos: communityData.recent_photos || []
        });
        setIsLoading(false);
        return;
      }

      // No data case
      setCommunityStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        recentPhotos: []
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching community stats:', error);
      setCommunityStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {},
        recentPhotos: []
      });
      setIsLoading(false);
    }
  };

  const fetchReviews = async (offset = 0, sortBy = 'recent') => {
    if (!restaurantPlaceId) return;
    
    const isLoadingMore = offset > 0;
    if (isLoadingMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const { data, error } = await supabase.rpc('get_restaurant_reviews', {
        place_id_param: restaurantPlaceId,
        page_limit: 10,
        page_offset: offset,
        sort_by: sortBy,
        requesting_user_id: user?.id || null
      });
      
      if (error) throw error;
      
      const formattedReviews: UserReview[] = (data || []).map((review: any) => ({
        reviewId: review.review_id,
        userId: review.user_id,
        username: review.username,
        overallRating: review.overall_rating,
        categoryRatings: review.category_ratings,
        reviewText: review.review_text,
        photos: review.photos || [],
        photoCaptions: review.photo_captions || [],
        photoDishNames: review.photo_dish_names || [],
        helpfulCount: review.helpful_count,
        createdAt: review.created_at,
        userFoundHelpful: review.user_found_helpful
      }));
      
      if (offset === 0) {
        setReviews(formattedReviews);
      } else {
        setReviews(prev => [...prev, ...formattedReviews]);
      }
      
      setHasMore(formattedReviews.length === 10);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const markHelpful = async (reviewId: string, isHelpful: boolean) => {
    if (!user) return;
    
    try {
      if (isHelpful) {
        // First try to find existing record and update/insert
        const { error: upsertError } = await supabase.from('review_helpfulness')
          .upsert({
            review_id: reviewId,
            user_id: user.id,
            is_helpful: true
          }, {
            onConflict: 'review_id,user_id'
          });
        
        if (upsertError) throw upsertError;
      } else {
        await supabase.from('review_helpfulness')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);
      }
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.reviewId === reviewId 
          ? { 
              ...review, 
              userFoundHelpful: isHelpful,
              helpfulCount: isHelpful ? review.helpfulCount + 1 : review.helpfulCount - 1
            }
          : review
      ));
    } catch (error) {
      console.error('Error updating helpfulness:', error);
    }
  };

  const submitReview = async (reviewData: {
    overallRating: number;
    categoryRatings?: CategoryRating;
    reviewText?: string;
    photos?: string[];
    photoCaptions?: string[];
    photoDishNames?: string[];
    restaurantName: string;
    restaurantAddress: string;
  }) => {
    if (!user || !restaurantPlaceId) return;
    
    try {
      const { error } = await supabase.from('user_reviews').insert({
        user_id: user.id,
        restaurant_place_id: restaurantPlaceId,
        restaurant_name: reviewData.restaurantName,
        restaurant_address: reviewData.restaurantAddress,
        overall_rating: reviewData.overallRating,
        category_ratings: reviewData.categoryRatings as any,
        review_text: reviewData.reviewText,
        photos: reviewData.photos || [],
        photo_captions: reviewData.photoCaptions || [],
        photo_dish_names: reviewData.photoDishNames || []
      });
      
      if (error) throw error;
      
      // Refresh data
      await fetchCommunityStats();
      await fetchReviews();
    } catch (error) {
      console.error('Error submitting review:', error);
      throw error;
    }
  };

  // Set up real-time subscriptions for automatic updates
  useEffect(() => {
    if (!restaurantPlaceId) return;

    let restaurantChannel: RealtimeChannel | null = null;
    let reviewChannel: RealtimeChannel | null = null;

    const setupRealtimeSubscriptions = () => {
      // Listen for changes to restaurants table (when ratings are added/updated)
      restaurantChannel = supabase
        .channel('restaurant-ratings-updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'restaurants',
            filter: `google_place_id=eq.${restaurantPlaceId}` // Only for this restaurant
          },
          (payload) => {
            console.log('Restaurant rating updated in real-time:', payload);
            // Refresh community stats immediately when any rating changes
            fetchCommunityStats();
          }
        )
        .subscribe();

      // Listen for changes to user_reviews table  
      reviewChannel = supabase
        .channel('user-reviews-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public', 
            table: 'user_reviews',
            filter: `restaurant_place_id=eq.${restaurantPlaceId}` // Only for this restaurant
          },
          (payload) => {
            console.log('User review updated in real-time:', payload);
            // Refresh both stats and reviews when user reviews change
            fetchCommunityStats();
            fetchReviews();
          }
        )
        .subscribe();
    };

    // Initial load
    fetchCommunityStats();
    fetchReviews();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();

    // Cleanup subscriptions on unmount or restaurantPlaceId change
    return () => {
      if (restaurantChannel) {
        supabase.removeChannel(restaurantChannel);
      }
      if (reviewChannel) {
        supabase.removeChannel(reviewChannel);
      }
    };
  }, [restaurantPlaceId, restaurantName]);

  return {
    communityStats,
    reviews,
    isLoading,
    isLoadingMore,
    hasMore,
    fetchReviews,
    markHelpful,
    submitReview,
    refetch: () => {
      fetchCommunityStats();
      fetchReviews();
    }
  };
}
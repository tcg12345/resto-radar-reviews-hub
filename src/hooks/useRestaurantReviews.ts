import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CategoryRating } from '@/types/restaurant';

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

export function useRestaurantReviews(restaurantPlaceId?: string) {
  const { user } = useAuth();
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchCommunityStats = async () => {
    if (!restaurantPlaceId) return;
    
    try {
      const { data, error } = await supabase.rpc('get_restaurant_community_stats', {
        place_id_param: restaurantPlaceId
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const stats = data[0];
        setCommunityStats({
          averageRating: Number(stats.average_rating) || 0,
          totalReviews: Number(stats.total_reviews) || 0,
          ratingDistribution: (stats.rating_distribution as Record<string, number>) || {},
          recentPhotos: (stats.recent_photos as any[]) || []
        });
      }
    } catch (error) {
      console.error('Error fetching community stats:', error);
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
        sort_by: sortBy
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
        await supabase.from('review_helpfulness').insert({
          review_id: reviewId,
          user_id: user.id,
          is_helpful: true
        });
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

  useEffect(() => {
    if (restaurantPlaceId) {
      fetchCommunityStats();
      fetchReviews();
    }
  }, [restaurantPlaceId]);

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
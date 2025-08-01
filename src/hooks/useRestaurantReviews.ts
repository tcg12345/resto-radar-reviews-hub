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

export function useRestaurantReviews(restaurantPlaceId?: string, restaurantName?: string) {
  const { user } = useAuth();
  const [communityStats, setCommunityStats] = useState<CommunityStats | null>(null);
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchCommunityStats = async () => {
    if (!restaurantPlaceId) {
      console.log('fetchCommunityStats - No restaurantPlaceId provided:', restaurantPlaceId);
      return;
    }
    
    console.log('fetchCommunityStats - restaurantPlaceId:', restaurantPlaceId);
    
    try {
      // First, try to automatically link restaurants by finding unlinked ones
      let nameToSearch = restaurantName;
      
      // Extract restaurant name from URL if not provided
      if (!nameToSearch) {
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        if (dataParam) {
          try {
            const restaurantData = JSON.parse(decodeURIComponent(dataParam));
            nameToSearch = restaurantData.name;
          } catch (e) {
            console.log('Could not parse restaurant data from URL');
          }
        }
      }

      // Try to find and link unlinked restaurants with this name
      if (nameToSearch) {
        try {
          console.log('Searching for unlinked restaurants with name:', nameToSearch);
          
          // Find restaurants without place_id that match the name
          const { data: unlinkedRestaurants, error: searchError } = await supabase
            .from('restaurants')
            .select('id, name')
            .is('google_place_id', null)
            .eq('is_wishlist', false)
            .not('rating', 'is', null);
          
          if (!searchError && unlinkedRestaurants) {
            const matchingRestaurants = unlinkedRestaurants.filter(r => {
              const rName = r.name.toLowerCase().trim();
              const searchName = nameToSearch.toLowerCase().trim();
              
              return rName === searchName ||
                     rName.includes(searchName) ||
                     searchName.includes(rName) ||
                     (rName.length > 3 && searchName.length > 3 && 
                      (rName.substring(0, 4) === searchName.substring(0, 4))); // First 4 chars match
            });
            
            if (matchingRestaurants.length > 0) {
              console.log(`Found ${matchingRestaurants.length} unlinked restaurants to update`);
              
              // Update them with the place_id
              const { error: updateError } = await supabase
                .from('restaurants')
                .update({ google_place_id: restaurantPlaceId })
                .in('id', matchingRestaurants.map(r => r.id));
              
              if (updateError) {
                console.error('Error updating restaurants with place_id:', updateError);
              } else {
                console.log('Successfully linked restaurants to place_id');
              }
            }
          }
        } catch (linkError) {
          console.error('Error linking restaurants:', linkError);
        }
      }

      // Now try to get restaurants that match this place_id
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('rating, user_id')
        .eq('google_place_id', restaurantPlaceId)
        .eq('is_wishlist', false)
        .not('rating', 'is', null);
      
      console.log('fetchCommunityStats - Direct query result:', restaurantData);
      console.log('fetchCommunityStats - Direct query error:', restaurantError);
      
      if (restaurantError) {
        console.error('Error fetching restaurant data:', restaurantError);
        return;
      }
      
      // Process the original data if we found any
      if (restaurantData && restaurantData.length > 0) {
        const ratings = restaurantData.map(r => r.rating).filter(r => r !== null);
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        // Create rating distribution
        const distribution = {
          '9-10': ratings.filter(r => r >= 9).length,
          '7-8': ratings.filter(r => r >= 7 && r < 9).length,
          '5-6': ratings.filter(r => r >= 5 && r < 7).length,
          '3-4': ratings.filter(r => r >= 3 && r < 5).length,
          '1-2': ratings.filter(r => r >= 1 && r < 3).length,
        };
        
        setCommunityStats({
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews: ratings.length,
          ratingDistribution: distribution,
          recentPhotos: []
        });
        
        console.log('Set community stats from direct query:', {
          averageRating: Number(averageRating.toFixed(1)),
          totalReviews: ratings.length,
          ratingDistribution: distribution
        });
      } else {
        // No data found at all
        setCommunityStats({
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {},
          recentPhotos: []
        });
        console.log('No ratings found for this restaurant');
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

  useEffect(() => {
    if (restaurantPlaceId) {
      fetchCommunityStats();
      fetchReviews();
    }
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
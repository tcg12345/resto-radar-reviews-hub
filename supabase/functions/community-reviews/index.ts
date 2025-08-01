import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RestaurantMatch {
  rating: number;
  user_id: string;
  photos: string[];
  photo_captions: string[];
  photo_dish_names: string[];
  created_at: string;
  helpful_count: number;
  review_id: string;
  source: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { place_id, restaurant_name } = await req.json();
    
    if (!place_id && !restaurant_name) {
      return new Response(JSON.stringify({ error: 'place_id or restaurant_name required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`🔍 Finding community reviews for: ${restaurant_name} (${place_id})`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allMatches: RestaurantMatch[] = [];

    // Strategy 1: Exact Google Place ID match
    if (place_id) {
      console.log('📍 Strategy 1: Searching by place_id...');
      const { data: placeIdMatches, error: placeIdError } = await supabase
        .from('restaurants')
        .select('rating, user_id, photos, photo_captions, photo_dish_names, created_at, id')
        .eq('google_place_id', place_id)
        .not('rating', 'is', null)
        .eq('is_wishlist', false);

      if (!placeIdError && placeIdMatches) {
        console.log(`Found ${placeIdMatches.length} ratings by place_id`);
        allMatches.push(...placeIdMatches.map(match => ({
          ...match,
          helpful_count: 0,
          review_id: match.id,
          source: 'place_id_match'
        })));
      }
    }

    // Strategy 2: User reviews table
    if (place_id) {
      console.log('📝 Strategy 2: Searching user_reviews table...');
      const { data: userReviews, error: userReviewsError } = await supabase
        .from('user_reviews')
        .select('overall_rating, user_id, photos, photo_captions, photo_dish_names, created_at, helpful_count, id')
        .eq('restaurant_place_id', place_id);

      if (!userReviewsError && userReviews) {
        console.log(`Found ${userReviews.length} user reviews`);
        allMatches.push(...userReviews.map(review => ({
          rating: review.overall_rating,
          user_id: review.user_id,
          photos: review.photos || [],
          photo_captions: review.photo_captions || [],
          photo_dish_names: review.photo_dish_names || [],
          created_at: review.created_at,
          helpful_count: review.helpful_count || 0,
          review_id: review.id,
          source: 'user_reviews'
        })));
      }
    }

    // Strategy 3: Fuzzy name matching for all restaurants
    if (restaurant_name) {
      console.log('🔍 Strategy 3: Fuzzy name matching...');
      
      // Get ALL restaurants to do fuzzy matching
      const { data: allRestaurants, error: allRestaurantsError } = await supabase
        .from('restaurants')
        .select('id, name, rating, user_id, photos, photo_captions, photo_dish_names, created_at, google_place_id')
        .not('rating', 'is', null)
        .eq('is_wishlist', false);

      if (!allRestaurantsError && allRestaurants) {
        const normalizedSearchName = restaurant_name.toLowerCase().trim();
        
        // Multiple fuzzy matching strategies
        const fuzzyMatches = allRestaurants.filter(restaurant => {
          const restaurantName = restaurant.name.toLowerCase().trim();
          
          // Skip if already matched by place_id
          if (place_id && restaurant.google_place_id === place_id) {
            return false;
          }
          
          // Exact match
          if (restaurantName === normalizedSearchName) return true;
          
          // Contains match (both directions)
          if (restaurantName.includes(normalizedSearchName) || normalizedSearchName.includes(restaurantName)) return true;
          
          // First word match (for chains)
          const searchFirstWord = normalizedSearchName.split(' ')[0];
          const restaurantFirstWord = restaurantName.split(' ')[0];
          if (searchFirstWord.length > 3 && restaurantFirstWord.length > 3 && searchFirstWord === restaurantFirstWord) return true;
          
          // Remove common words and try again
          const commonWords = ['the', 'restaurant', 'bar', 'grill', 'cafe', 'kitchen', 'house', 'dining'];
          const cleanSearchName = normalizedSearchName.split(' ').filter(word => !commonWords.includes(word)).join(' ');
          const cleanRestaurantName = restaurantName.split(' ').filter(word => !commonWords.includes(word)).join(' ');
          
          if (cleanSearchName && cleanRestaurantName && (
            cleanSearchName === cleanRestaurantName ||
            cleanSearchName.includes(cleanRestaurantName) ||
            cleanRestaurantName.includes(cleanSearchName)
          )) return true;
          
          return false;
        });

        console.log(`Found ${fuzzyMatches.length} fuzzy name matches`);
        allMatches.push(...fuzzyMatches.map(match => ({
          rating: match.rating,
          user_id: match.user_id,
          photos: match.photos || [],
          photo_captions: match.photo_captions || [],
          photo_dish_names: match.photo_dish_names || [],
          created_at: match.created_at,
          helpful_count: 0,
          review_id: match.id,
          source: 'fuzzy_name_match'
        })));
      }
    }

    // Strategy 4: Cross-reference with user_reviews names
    if (restaurant_name) {
      console.log('🔗 Strategy 4: Cross-referencing with user_reviews names...');
      
      // Find other place_ids that refer to the same restaurant name
      const { data: similarUserReviews, error: similarError } = await supabase
        .from('user_reviews')
        .select('restaurant_place_id, restaurant_name')
        .ilike('restaurant_name', `%${restaurant_name}%`);

      if (!similarError && similarUserReviews) {
        for (const similarReview of similarUserReviews) {
          if (similarReview.restaurant_place_id && similarReview.restaurant_place_id !== place_id) {
            // Find restaurants with this similar place_id
            const { data: crossRefMatches, error: crossRefError } = await supabase
              .from('restaurants')
              .select('rating, user_id, photos, photo_captions, photo_dish_names, created_at, id')
              .eq('google_place_id', similarReview.restaurant_place_id)
              .not('rating', 'is', null)
              .eq('is_wishlist', false);

            if (!crossRefError && crossRefMatches) {
              console.log(`Found ${crossRefMatches.length} cross-reference matches for ${similarReview.restaurant_place_id}`);
              allMatches.push(...crossRefMatches.map(match => ({
                ...match,
                helpful_count: 0,
                review_id: match.id,
                source: 'cross_reference'
              })));
            }
          }
        }
      }
    }

    // Remove duplicates based on review_id
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.review_id === match.review_id)
    );

    console.log(`🎯 Total unique matches found: ${uniqueMatches.length}`);
    console.log(`Sources breakdown:`, {
      place_id_match: uniqueMatches.filter(m => m.source === 'place_id_match').length,
      user_reviews: uniqueMatches.filter(m => m.source === 'user_reviews').length,
      fuzzy_name_match: uniqueMatches.filter(m => m.source === 'fuzzy_name_match').length,
      cross_reference: uniqueMatches.filter(m => m.source === 'cross_reference').length
    });

    // Calculate community stats
    const totalReviews = uniqueMatches.length;
    const averageRating = totalReviews > 0 
      ? uniqueMatches.reduce((sum, match) => sum + match.rating, 0) / totalReviews 
      : 0;

    const ratingDistribution = {
      '9-10': uniqueMatches.filter(m => m.rating >= 9).length,
      '7-8': uniqueMatches.filter(m => m.rating >= 7 && m.rating < 9).length,
      '5-6': uniqueMatches.filter(m => m.rating >= 5 && m.rating < 7).length,
      '3-4': uniqueMatches.filter(m => m.rating >= 3 && m.rating < 5).length,
      '1-2': uniqueMatches.filter(m => m.rating >= 1 && m.rating < 3).length
    };

    // Get user profiles for recent photos
    const matchesWithPhotos = uniqueMatches.filter(m => m.photos && m.photos.length > 0);
    const userIds = [...new Set(matchesWithPhotos.map(m => m.user_id))];
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    const recentPhotos = matchesWithPhotos
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)
      .map(match => ({
        review_id: match.review_id,
        user_id: match.user_id,
        username: profilesMap.get(match.user_id) || 'Anonymous',
        photos: match.photos,
        captions: match.photo_captions,
        dish_names: match.photo_dish_names,
        created_at: match.created_at,
        helpful_count: match.helpful_count
      }));

    const response = {
      average_rating: Math.round(averageRating * 100) / 100,
      total_reviews: totalReviews,
      rating_distribution: ratingDistribution,
      recent_photos: recentPhotos,
      debug: {
        strategies_used: uniqueMatches.reduce((acc, match) => {
          acc[match.source] = (acc[match.source] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    };

    console.log('📊 Final response:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in community-reviews function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
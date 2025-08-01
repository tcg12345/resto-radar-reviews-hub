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
  username?: string;
}

function normalizeRestaurantName(name: string): string {
  const commonWords = ['the', 'restaurant', 'bar', 'grill', 'cafe', 'kitchen', 'house', 'dining', 'room', 'club'];
  return name.toLowerCase()
    .trim()
    .split(' ')
    .filter(word => !commonWords.includes(word))
    .join(' ');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🚀 Community Reviews Function Called');

  try {
    const { place_id, restaurant_name } = await req.json();
    
    console.log('📥 Input received:', { place_id, restaurant_name });

    if (!place_id && !restaurant_name) {
      console.log('❌ No place_id or restaurant_name provided');
      return new Response(JSON.stringify({ error: 'place_id or restaurant_name required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allMatches: RestaurantMatch[] = [];
    let totalStrategiesUsed = 0;

    // STRATEGY 1: Exact Google Place ID match
    if (place_id) {
      console.log('📍 Strategy 1: Searching by exact place_id:', place_id);
      totalStrategiesUsed++;
      
      const { data: placeIdMatches, error: placeIdError } = await supabase
        .from('restaurants')
        .select('rating, user_id, photos, photo_captions, photo_dish_names, created_at, id')
        .eq('google_place_id', place_id)
        .not('rating', 'is', null)
        .eq('is_wishlist', false);

      if (!placeIdError && placeIdMatches) {
        console.log(`✅ Found ${placeIdMatches.length} ratings by exact place_id`);
        allMatches.push(...placeIdMatches.map(match => ({
          ...match,
          helpful_count: 0,
          review_id: match.id,
          source: 'exact_place_id'
        })));
      } else {
        console.log('❌ Place ID strategy error:', placeIdError);
      }
    }

    // STRATEGY 2: User reviews table
    if (place_id) {
      console.log('📝 Strategy 2: Searching user_reviews table for place_id:', place_id);
      totalStrategiesUsed++;
      
      const { data: userReviews, error: userReviewsError } = await supabase
        .from('user_reviews')
        .select('overall_rating, user_id, photos, photo_captions, photo_dish_names, created_at, helpful_count, id')
        .eq('restaurant_place_id', place_id);

      if (!userReviewsError && userReviews) {
        console.log(`✅ Found ${userReviews.length} user reviews`);
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
      } else {
        console.log('❌ User reviews strategy error:', userReviewsError);
      }
    }

    // STRATEGY 3: Efficient name-based matching with database queries
    if (restaurant_name) {
      console.log('🔍 Strategy 3: Efficient name matching for:', restaurant_name);
      totalStrategiesUsed++;
      
      const normalizedSearchName = normalizeRestaurantName(restaurant_name);
      const searchWords = restaurant_name.toLowerCase().split(' ');
      const firstWord = searchWords[0];
      
      // Multiple efficient queries instead of scanning all
      const nameQueries = [
        // Exact name match
        supabase
          .from('restaurants')
          .select('id, name, rating, user_id, photos, photo_captions, photo_dish_names, created_at, google_place_id')
          .ilike('name', restaurant_name)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .limit(20),
        
        // Contains search name
        supabase
          .from('restaurants')
          .select('id, name, rating, user_id, photos, photo_captions, photo_dish_names, created_at, google_place_id')
          .ilike('name', `%${restaurant_name}%`)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .limit(20),
          
        // First word match (for chains)
        firstWord.length > 3 ? supabase
          .from('restaurants')
          .select('id, name, rating, user_id, photos, photo_captions, photo_dish_names, created_at, google_place_id')
          .ilike('name', `${firstWord}%`)
          .not('rating', 'is', null)
          .eq('is_wishlist', false)
          .limit(20) : null
      ].filter(Boolean);

      const nameResults = await Promise.all(nameQueries);
      
      let nameMatches: any[] = [];
      nameResults.forEach(result => {
        if (!result.error && result.data) {
          nameMatches.push(...result.data.filter(restaurant => {
            // Skip if already matched by exact place_id
            return !(place_id && restaurant.google_place_id === place_id);
          }));
        }
      });

      // Remove duplicates by id
      const uniqueNameMatches = nameMatches.filter((match, index, self) => 
        index === self.findIndex(m => m.id === match.id)
      );

      console.log(`✅ Found ${uniqueNameMatches.length} name-based matches`);
      allMatches.push(...uniqueNameMatches.map(match => ({
        rating: match.rating,
        user_id: match.user_id,
        photos: match.photos || [],
        photo_captions: match.photo_captions || [],
        photo_dish_names: match.photo_dish_names || [],
        created_at: match.created_at,
        helpful_count: 0,
        review_id: match.id,
        source: 'name_match'
      })));
    }

    // STRATEGY 4: Cross-reference ALL place_ids with similar names
    if (restaurant_name) {
      console.log('🔗 Strategy 4: Cross-referencing ALL place_ids...');
      totalStrategiesUsed++;
      
      // Find ALL user_reviews with similar restaurant names
      const { data: allUserReviews, error: allUserReviewsError } = await supabase
        .from('user_reviews')
        .select('restaurant_place_id, restaurant_name');

      if (!allUserReviewsError && allUserReviews) {
        const similarPlaceIds = allUserReviews
          .filter(review => {
            const reviewName = review.restaurant_name.toLowerCase();
            const searchName = restaurant_name.toLowerCase();
            return reviewName.includes(searchName) || searchName.includes(reviewName);
          })
          .map(review => review.restaurant_place_id)
          .filter(pid => pid && pid !== place_id);

        console.log(`🔍 Found ${similarPlaceIds.length} similar place_ids to check`);

        // Find restaurants matching any of these place_ids
        for (const similarPlaceId of similarPlaceIds) {
          const { data: crossRefMatches, error: crossRefError } = await supabase
            .from('restaurants')
            .select('rating, user_id, photos, photo_captions, photo_dish_names, created_at, id')
            .eq('google_place_id', similarPlaceId)
            .not('rating', 'is', null)
            .eq('is_wishlist', false);

          if (!crossRefError && crossRefMatches) {
            console.log(`✅ Found ${crossRefMatches.length} cross-reference matches for ${similarPlaceId}`);
            allMatches.push(...crossRefMatches.map(match => ({
              ...match,
              helpful_count: 0,
              review_id: match.id,
              source: 'cross_reference'
            })));
          }
        }
      } else {
        console.log('❌ Cross-reference strategy error:', allUserReviewsError);
      }
    }

    // Remove duplicates and get user profiles
    const uniqueMatches = allMatches.filter((match, index, self) => 
      index === self.findIndex(m => m.review_id === match.review_id)
    );

    console.log(`🎯 FINAL RESULTS:`);
    console.log(`   - Total strategies used: ${totalStrategiesUsed}`);
    console.log(`   - Raw matches found: ${allMatches.length}`);
    console.log(`   - Unique matches: ${uniqueMatches.length}`);
    
    const sourceBreakdown = uniqueMatches.reduce((acc, match) => {
      acc[match.source] = (acc[match.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`   - Source breakdown:`, sourceBreakdown);

    // Get user profiles for usernames
    const userIds = [...new Set(uniqueMatches.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);

    
    const profilesMap = new Map(profiles?.map(p => [p.id, p.username]) || []);

    // Calculate stats
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

    // Get recent photos with usernames
    const matchesWithPhotos = uniqueMatches.filter(m => m.photos && m.photos.length > 0);
    const recentPhotos = matchesWithPhotos
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100) // Increased limit for more photos
      .map(match => ({
        review_id: match.review_id,
        user_id: match.user_id,
        username: profilesMap.get(match.user_id) || 'Anonymous',
        photos: match.photos || [], // Show ALL photos from each user
        captions: match.photo_captions || [],
        dish_names: match.photo_dish_names || [],
        created_at: match.created_at,
        helpful_count: match.helpful_count
      }));

    const response = {
      average_rating: Math.round(averageRating * 100) / 100,
      total_reviews: totalReviews,
      rating_distribution: ratingDistribution,
      recent_photos: recentPhotos,
      debug: {
        strategies_used: totalStrategiesUsed,
        source_breakdown: sourceBreakdown,
        search_terms: { place_id, restaurant_name }
      }
    };

    console.log('📊 RESPONSE SUMMARY:');
    console.log(`   ⭐ Average rating: ${response.average_rating}`);
    console.log(`   📝 Total reviews: ${response.total_reviews}`);
    console.log(`   📸 Photos: ${response.recent_photos.length}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 CRITICAL ERROR in community-reviews function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      debug: 'Function failed completely'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
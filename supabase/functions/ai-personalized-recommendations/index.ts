import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserRestaurant {
  name: string;
  cuisine: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  city: string;
  address: string;
  notes?: string;
}

interface RecommendationRequest {
  userRestaurants: UserRestaurant[];
  userLocation?: { lat: number; lng: number };
  limit?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    if (!googlePlacesApiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is not set');
    }

    const { userRestaurants, userLocation, limit = 8 }: RecommendationRequest = await req.json();

    if (!userRestaurants || userRestaurants.length === 0) {
      return new Response(JSON.stringify({ 
        recommendations: [],
        error: 'No user restaurant data provided'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating recommendations for user with ${userRestaurants.length} rated restaurants`);

    // Step 1: Analyze user preferences with AI
    const analysisPrompt = `Analyze this user's restaurant preferences based on their ratings and provide personalized recommendation criteria:

User's Rated Restaurants:
${userRestaurants.map(r => `
- ${r.name} (${r.cuisine}, ${r.city}): Rating ${r.rating}/10
  Address: ${r.address}
  ${r.notes ? `Notes: ${r.notes}` : ''}
`).join('')}

Based on this data, provide a JSON response with:
{
  "preferredCuisines": ["list of 3-5 preferred cuisines based on highest ratings"],
  "preferredLocations": ["list of 2-3 cities/areas where user dines most"],
  "ratingThreshold": number, // minimum rating they'd likely enjoy (based on their standards)
  "searchTerms": ["3-5 specific search terms for finding similar restaurants"],
  "locationRadius": number, // suggested search radius in meters based on their dining patterns
  "pricePreference": "budget|moderate|upscale|luxury", // based on the types of places they rate highly
  "insights": "brief explanation of their dining preferences"
}

Consider:
- Higher rated restaurants (>8.5) indicate strong preferences
- Geographic patterns in their dining locations
- Cuisine diversity vs. specialization
- Price point patterns from restaurant types
- Any patterns in their notes/descriptions`;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a restaurant recommendation expert. Analyze user dining patterns and respond with valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const analysisData = await analysisResponse.json();
    const preferences = JSON.parse(analysisData.choices[0].message.content);
    
    console.log('AI Analysis:', preferences);

    // Step 2: Search for restaurants using analyzed preferences
    const searchPromises = preferences.searchTerms.map(async (searchTerm: string) => {
      const searchLocation = userLocation ? 
        `${userLocation.lat},${userLocation.lng}` : 
        preferences.preferredLocations[0];

      const searchRadius = userLocation ? preferences.locationRadius : 50000; // 50km if no location

      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm)}&location=${searchLocation}&radius=${searchRadius}&type=restaurant&key=${googlePlacesApiKey}`;
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      return data.results || [];
    });

    const searchResults = await Promise.all(searchPromises);
    const allResults = searchResults.flat();

    // Step 3: Filter and score results using AI
    const filteredResults = allResults
      .filter((place: any) => {
        // Basic filtering
        const hasGoodRating = !place.rating || place.rating >= preferences.ratingThreshold - 0.5;
        const isRestaurant = place.types?.includes('restaurant') || place.types?.includes('food');
        
        // Remove places user has already rated
        const notAlreadyRated = !userRestaurants.some(ur => 
          ur.name.toLowerCase().includes(place.name.toLowerCase()) ||
          place.name.toLowerCase().includes(ur.name.toLowerCase())
        );

        return hasGoodRating && isRestaurant && notAlreadyRated;
      })
      .slice(0, limit * 2); // Get more than needed for final AI filtering

    // Step 4: Final AI ranking and filtering
    if (filteredResults.length === 0) {
      return new Response(JSON.stringify({ 
        recommendations: [],
        insights: preferences.insights,
        error: 'No suitable restaurants found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rankingPrompt = `Given this user's dining preferences and a list of potential restaurant recommendations, rank and select the best ${limit} restaurants for them:

User Preferences:
${JSON.stringify(preferences, null, 2)}

User's Favorite Restaurants (for reference):
${userRestaurants.filter(r => r.rating >= 8.5).map(r => `${r.name} (${r.cuisine}) - ${r.rating}/10`).join(', ')}

Potential Recommendations:
${filteredResults.map((place: any, index: number) => `
${index + 1}. ${place.name}
   - Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)
   - Address: ${place.formatted_address}
   - Types: ${place.types?.join(', ') || 'N/A'}
   - Price Level: ${place.price_level ? '$'.repeat(place.price_level) : 'N/A'}
`).join('')}

Select and rank the top ${limit} restaurants that best match this user's preferences. Respond with JSON:
{
  "recommendations": [
    {
      "place_id": "string",
      "name": "string", 
      "reason": "brief explanation why this matches their preferences",
      "confidence_score": number // 1-10 how confident this is a good match
    }
  ]
}

Prioritize restaurants that:
- Match their preferred cuisines and rating standards
- Are in convenient locations relative to their dining pattern
- Have similar quality/style to their highly-rated restaurants
- Offer new experiences while staying within their comfort zone`;

    const rankingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a restaurant recommendation expert. Rank restaurants based on user preferences and respond with valid JSON only.' },
          { role: 'user', content: rankingPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const rankingData = await rankingResponse.json();
    const rankedRecommendations = JSON.parse(rankingData.choices[0].message.content);

    // Step 5: Enrich recommendations with full place details
    const finalRecommendations = rankedRecommendations.recommendations
      .map((rec: any) => {
        const place = filteredResults.find((p: any) => p.place_id === rec.place_id);
        if (!place) return null;

        return {
          ...place,
          recommendation_reason: rec.reason,
          confidence_score: rec.confidence_score
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    console.log(`Generated ${finalRecommendations.length} recommendations`);

    return new Response(JSON.stringify({
      recommendations: finalRecommendations,
      preferences: preferences,
      insights: preferences.insights
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-personalized-recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      recommendations: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
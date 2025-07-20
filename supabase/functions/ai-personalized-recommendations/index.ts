import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RatedRestaurant {
  name: string;
  cuisine: string;
  rating: number;
  price_range?: number;
  notes?: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
}

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    open_now: boolean;
  };
  ai_reasoning?: string;
  confidence_score?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ratedRestaurants, userLocation } = await req.json();
    
    console.log(`Analyzing ${ratedRestaurants.length} rated restaurants for personalized recommendations`);

    if (!ratedRestaurants || ratedRestaurants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No rated restaurants provided for analysis' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Analyze user preferences with AI
    const analysisPrompt = `
    Analyze this user's restaurant preferences based on their ratings and provide recommendations:

    RATED RESTAURANTS:
    ${ratedRestaurants.map((r: RatedRestaurant) => 
      `- ${r.name} (${r.cuisine}) - Rating: ${r.rating}/5, Price: ${'$'.repeat(r.price_range || 2)} 
        Location: ${r.city}, Notes: ${r.notes || 'None'}`
    ).join('\n')}

    Based on this data, identify:
    1. Favorite cuisine types (prioritize highly rated ones)
    2. Preferred price range 
    3. Geographic preferences (which cities/areas they like)
    4. Any patterns in their notes or preferences

    Respond with a JSON object containing:
    {
      "favoriteCuisines": ["cuisine1", "cuisine2", "cuisine3"],
      "preferredPriceRange": 2,
      "preferredLocations": ["city1", "city2"],
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "reasoning": "Brief explanation of preferences identified"
    }
    `;

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a restaurant recommendation expert who analyzes dining preferences.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const analysisData = await analysisResponse.json();
    let preferences;
    
    try {
      preferences = JSON.parse(analysisData.choices[0].message.content);
      console.log('AI Analysis Result:', preferences);
    } catch (e) {
      console.error('Failed to parse AI analysis:', e);
      throw new Error('Failed to analyze preferences');
    }

    // Step 2: Search for restaurants based on preferences
    const searchQueries = [
      ...preferences.favoriteCuisines.slice(0, 3).map((cuisine: string) => `${cuisine} restaurant`),
      ...preferences.searchKeywords.slice(0, 2).map((keyword: string) => `${keyword} restaurant`)
    ];

    const allCandidates: GooglePlaceResult[] = [];

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googlePlacesApiKey}${userLocation ? `&location=${userLocation.lat},${userLocation.lng}&radius=25000` : ''}`;
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.status === 'OK' && searchData.results) {
          allCandidates.push(...searchData.results.slice(0, 10));
        }
      } catch (error) {
        console.error(`Error searching for ${query}:`, error);
      }
    }

    // Remove duplicates and already rated restaurants
    const ratedRestaurantNames = ratedRestaurants.map((r: RatedRestaurant) => r.name.toLowerCase());
    const uniqueCandidates = allCandidates
      .filter((place, index, arr) => 
        arr.findIndex(p => p.place_id === place.place_id) === index
      )
      .filter(place => 
        !ratedRestaurantNames.includes(place.name.toLowerCase())
      )
      .slice(0, 20); // Limit to top 20 for AI analysis

    if (uniqueCandidates.length === 0) {
      return new Response(JSON.stringify({
        recommendations: [],
        message: 'No new restaurants found matching your preferences'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Use AI to rank and explain recommendations
    const rankingPrompt = `
    Based on the user's preferences and rating history, rank these restaurant candidates and provide reasoning:

    USER PREFERENCES: ${JSON.stringify(preferences)}

    USER'S HIGHLY RATED RESTAURANTS (for reference):
    ${ratedRestaurants.filter((r: RatedRestaurant) => r.rating >= 4).map((r: RatedRestaurant) => 
      `- ${r.name} (${r.cuisine}) - ${r.rating}/5`
    ).join('\n')}

    RESTAURANT CANDIDATES:
    ${uniqueCandidates.map((place, index) => 
      `${index + 1}. ${place.name} - ${place.formatted_address}
         Rating: ${place.rating || 'N/A'} (${place.user_ratings_total || 0} reviews)
         Price: ${'$'.repeat(place.price_level || 2)}
         Types: ${place.types.join(', ')}`
    ).join('\n\n')}

    Select the top 6 restaurants that best match the user's preferences. For each, provide:
    1. Why it matches their taste (based on their highly rated restaurants)
    2. A confidence score (1-10)
    3. What specifically they might enjoy

    Respond with JSON:
    {
      "recommendations": [
        {
          "index": 0,
          "reasoning": "explanation",
          "confidence": 8,
          "matchFactors": ["factor1", "factor2"]
        }
      ]
    }
    `;

    const rankingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert restaurant curator who understands dining preferences.' },
          { role: 'user', content: rankingPrompt }
        ],
        temperature: 0.2,
      }),
    });

    const rankingData = await rankingResponse.json();
    let rankings;

    try {
      rankings = JSON.parse(rankingData.choices[0].message.content);
      console.log('AI Ranking Result:', rankings);
    } catch (e) {
      console.error('Failed to parse AI rankings:', e);
      throw new Error('Failed to rank recommendations');
    }

    // Step 4: Compile final recommendations
    const finalRecommendations = rankings.recommendations
      .map((rec: any) => {
        const place = uniqueCandidates[rec.index];
        if (!place) return null;
        
        return {
          ...place,
          ai_reasoning: rec.reasoning,
          confidence_score: rec.confidence,
          match_factors: rec.matchFactors
        };
      })
      .filter(Boolean)
      .slice(0, 6);

    console.log(`Generated ${finalRecommendations.length} personalized recommendations`);

    return new Response(JSON.stringify({
      recommendations: finalRecommendations,
      preferences: preferences,
      total_analyzed: ratedRestaurants.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI personalized recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate recommendations' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
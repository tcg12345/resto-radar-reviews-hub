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
    weekday_text?: string[];
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
    Analyze this user's restaurant preferences based on their ratings and provide recommendations.

    RATED RESTAURANTS:
    ${ratedRestaurants.map((r: RatedRestaurant) => 
      `- ${r.name} (${r.cuisine}) - Rating: ${r.rating}/5, Price: ${'$'.repeat(r.price_range || 2)} 
        Location: ${r.city}, Notes: ${r.notes || 'None'}`
    ).join('\n')}

    Based on this data, identify the user's preferences. 

    IMPORTANT: For preferredLocations, include ALL unique cities where the user has rated restaurants (minimum 5-8 cities if available). This ensures diverse geographical recommendations.

    Respond ONLY with a valid JSON object (no markdown, no code blocks):
    {
      "favoriteCuisines": ["cuisine1", "cuisine2", "cuisine3"],
      "preferredPriceRange": 2,
      "preferredLocations": ["all_cities_where_user_dined"],
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
      const responseContent = analysisData.choices[0].message.content;
      console.log('Raw AI response:', responseContent);
      
      // Extract JSON from markdown code blocks if present
      let jsonString = responseContent;
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      
      preferences = JSON.parse(jsonString);
      console.log('AI Analysis Result:', preferences);
    } catch (e) {
      console.error('Failed to parse AI analysis:', e);
      console.error('Raw response:', analysisData.choices[0].message.content);
      throw new Error('Failed to analyze preferences');
    }

    // Step 2: Search for restaurants based on preferences and locations
    const searchQueries = [
      ...preferences.favoriteCuisines.slice(0, 3).map((cuisine: string) => `${cuisine} restaurant`),
      ...preferences.searchKeywords.slice(0, 2).map((keyword: string) => `${keyword} restaurant`)
    ];

    const candidates = [];
    
    // Add randomization factor to prevent same results on each request
    const randomSeed = Math.random();

    // Use ALL of the user's preferred locations for maximum diversity
    const searchLocations = preferences.preferredLocations || [];
    console.log(`Searching in ${searchLocations.length} locations:`, JSON.stringify(searchLocations));

    for (const location of searchLocations) {
      for (const query of searchQueries.slice(0, 2)) { // Limit queries per location
        try {
          // Search for restaurants in each city where the user has dined
          const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + location)}&key=${googlePlacesApiKey}`;
          
          console.log(`Searching: ${query} in ${location}`);
          const searchResponse = await fetch(searchUrl);
          const searchData = await searchResponse.json();

          if (searchData.status === 'OK' && searchData.results) {
            // Get 2-3 results per location to ensure diversity
            candidates.push(...searchData.results.slice(0, 3));
          }
        } catch (error) {
          console.error(`Error searching for ${query} in ${location}:`, error);
        }
      }
    }

    // Remove duplicates based on place_id and shuffle for variety
    const uniqueCandidates = candidates.filter((place, index, self) => 
      index === self.findIndex(p => p.place_id === place.place_id)
    );
    
    // Add some randomization to prevent same results every time
    const shuffledCandidates = uniqueCandidates
      .map((candidate, index) => ({ candidate, index, sort: Math.random() + randomSeed }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ candidate }) => candidate)
      .slice(0, 20); // Limit to top 20 for AI analysis
    
    if (shuffledCandidates.length === 0) {
      return new Response(JSON.stringify({
        recommendations: [],
        preferences: preferences,
        total_analyzed: ratedRestaurants.length,
        message: "No suitable recommendations found in your preferred locations"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Filter out already rated restaurants
    const ratedRestaurantNames = ratedRestaurants.map((r: RatedRestaurant) => r.name.toLowerCase());
    const candidatesForRanking = shuffledCandidates.filter(place => 
      !ratedRestaurantNames.includes(place.name.toLowerCase())
    );

    // Step 3: Use AI to rank and provide reasoning for recommendations
    const rankingPrompt = `Based on the user's dining preferences below, rank these restaurant candidates and provide reasoning for your top 6 recommendations.

User Preferences:
${JSON.stringify(preferences, null, 2)}

Restaurant Candidates:
${candidatesForRanking.map((place, index) => 
  `${index}: ${place.name} - ${place.formatted_address} - Rating: ${place.rating || 'N/A'} - Price: ${place.price_level || 'N/A'} - Types: ${place.types?.join(', ') || 'N/A'}`
).join('\n')}

Return a JSON object with exactly this structure:
{
  "recommendations": [
    {
      "index": 0,
      "reasoning": "Why this restaurant matches the user's preferences",
      "confidence": 8,
      "matchFactors": ["factor1", "factor2"]
    }
  ]
}`;

    const rankingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert restaurant curator. Return only valid JSON.' },
          { role: 'user', content: rankingPrompt }
        ],
        temperature: 0.2,
      }),
    });

    const rankingData = await rankingResponse.json();
    let rankings;

    try {
      const responseContent = rankingData.choices[0].message.content;
      console.log('Raw ranking response:', responseContent);
      
      // Extract JSON from markdown code blocks if present
      let jsonString = responseContent;
      const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }
      
      rankings = JSON.parse(jsonString);
      console.log('AI Ranking Result:', rankings);
    } catch (e) {
      console.error('Failed to parse AI rankings:', e);
      console.error('Raw ranking response:', rankingData.choices[0].message.content);
      throw new Error('Failed to rank recommendations');
    }

    // Step 4: Compile final recommendations with enhanced data
    const finalRecommendations = [];
    
    for (const rec of rankings.recommendations.slice(0, 6)) {
      const place = candidatesForRanking[rec.index];
      if (!place) continue;
      
      // Get detailed place information including website and better photos
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,user_ratings_total,price_level,photos,geometry,opening_hours,types,website,url,formatted_phone_number&key=${googlePlacesApiKey}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK' && detailsData.result) {
          const detailedPlace = detailsData.result;
          
          // Filter out photos that are likely to be maps/icons (small photos or those with certain characteristics)
          const goodPhotos = detailedPlace.photos?.filter((photo: any) => 
            photo.width >= 400 && photo.height >= 300
          ) || [];
          
          finalRecommendations.push({
            ...detailedPlace,
            photos: goodPhotos.length > 0 ? goodPhotos.slice(0, 1) : [], // Only use first good photo or none
            ai_reasoning: rec.reasoning,
            confidence_score: rec.confidence,
            match_factors: rec.matchFactors,
            website: detailedPlace.website || null,
            google_maps_url: detailedPlace.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            formatted_phone_number: detailedPlace.formatted_phone_number || null,
            price_range: detailedPlace.price_level || place.price_level || 2
          });
        } else {
          // Fallback to original data without photos
          finalRecommendations.push({
            ...place,
            photos: [], // Remove all photos to avoid map icons
            ai_reasoning: rec.reasoning,
            confidence_score: rec.confidence,
            match_factors: rec.matchFactors,
            website: null,
            google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
            formatted_phone_number: null,
            price_range: place.price_level || 2
          });
        }
      } catch (error) {
        console.error(`Error getting details for ${place.name}:`, error);
        finalRecommendations.push({
          ...place,
          photos: [], // Remove all photos on error
          ai_reasoning: rec.reasoning,
          confidence_score: rec.confidence,
          match_factors: rec.matchFactors,
          website: null,
          google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
          formatted_phone_number: null,
          price_range: place.price_level || 2
        });
      }
    }

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
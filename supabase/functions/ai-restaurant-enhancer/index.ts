import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantInfo {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  availableCuisines?: string[];
}

interface AIEnhancedData {
  cuisine: string;
  city: string;
  michelinStars: number | null;
  priceRange: number | null;
  reservable: boolean;
  reservationPlatform: string | null;
  reservationUrl: string | null;
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurant, availableCuisines, websiteUrl }: { restaurant: RestaurantInfo, availableCuisines?: string[], websiteUrl?: string } = await req.json();

    if (!restaurant?.name) {
      throw new Error('Restaurant name is required');
    }

    console.log('Analyzing restaurant:', restaurant);

    const cuisineList = availableCuisines && availableCuisines.length > 0 
      ? availableCuisines.join(', ') 
      : 'American, Italian, French, Chinese, Japanese, Indian, Mediterranean, Mexican, Thai, Vietnamese, Korean, Spanish, Greek, Brazilian, Steakhouse, Seafood, Modern, Classic';

    const prompt = `Analyze this restaurant and provide accurate information:

Restaurant Name: ${restaurant.name}
${restaurant.address ? `Address: ${restaurant.address}` : ''}
${restaurant.city ? `City: ${restaurant.city}` : ''}
${restaurant.country ? `Country: ${restaurant.country}` : ''}
${websiteUrl ? `Website: ${websiteUrl}` : ''}

Please provide:
1. Cuisine type - Choose the BEST match from these available options: ${cuisineList}
2. City - Extract and clean the city name from the address (just the city name, no state/country)
3. Michelin stars (0-3, or null if not a Michelin-starred restaurant)
4. Price range (1-4 scale: 1=$ budget, 2=$$ moderate, 3=$$$ expensive, 4=$$$$ luxury)
5. Reservable - Whether the restaurant accepts reservations (true/false)
6. Reservation Platform - If reservable, identify the likely platform: "OpenTable", "Resy", "SevenRooms", "Tock", or null if unknown
7. Direct Booking Link - ONLY provide a reservationUrl if you are 100% certain it's a real, working direct booking link. DO NOT generate or guess URLs. If you're not absolutely certain the URL exists and works, set reservationUrl to null.
8. Brief reasoning for your analysis

Response format (JSON only):
{
  "cuisine": "cuisine_type_from_available_options",
  "city": "cleaned_city_name",
  "michelinStars": number_or_null,
  "priceRange": number,
  "reservable": boolean,
  "reservationPlatform": "platform_name_or_null",
  "reservationUrl": "verified_direct_booking_url_or_null",
  "reasoning": "brief_explanation"
}

Important: 
- Only respond with valid JSON
- For cuisine, ONLY use one of the available options provided
- For reservationUrl, ONLY provide real, verified direct booking links that you know exist
- If you're not 100% certain a reservation link exists and works, set reservationUrl to null
- Do NOT generate fake or guessed URLs
- Be conservative with Michelin stars - only assign them if you're confident`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a restaurant reservation expert who finds direct booking links on OpenTable, Resy, SevenRooms, and Tock. You have access to current reservation platform data and can find exact booking URLs. Always respond with valid JSON only and provide direct booking links when available.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    console.log('OpenAI response:', content);

    // Parse the JSON response
    let enhancedData: AIEnhancedData;
    try {
      enhancedData = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Fallback with defaults
      enhancedData = {
        cuisine: 'American',
        city: restaurant.city || '',
        michelinStars: null,
        priceRange: 2,
        reservable: false,
        reservationPlatform: null,
        reservationUrl: null,
        reasoning: 'Could not determine specific details'
      };
    }

    // Validate and sanitize the response
    const result = {
      cuisine: enhancedData.cuisine || 'American',
      city: enhancedData.city || restaurant.city || '',
      michelinStars: enhancedData.michelinStars && enhancedData.michelinStars >= 1 && enhancedData.michelinStars <= 3 
        ? enhancedData.michelinStars 
        : null,
      priceRange: enhancedData.priceRange && enhancedData.priceRange >= 1 && enhancedData.priceRange <= 4 
        ? enhancedData.priceRange 
        : 2,
      reservable: enhancedData.reservable || false,
      reservationPlatform: enhancedData.reservationPlatform || null,
      reservationUrl: enhancedData.reservationUrl || null,
      reasoning: enhancedData.reasoning || 'Analysis completed'
    };

    console.log('Enhanced restaurant data:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-restaurant-enhancer function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      cuisine: 'American',
      city: '',
      michelinStars: null,
      priceRange: 2,
      reservable: false,
      reservationPlatform: null,
      reservationUrl: null,
      reasoning: 'Error occurred during analysis'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
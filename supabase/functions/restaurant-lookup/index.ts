import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantLookupRequest {
  restaurantName: string;
  city?: string;
}

interface RestaurantInfo {
  name: string;
  address: string;
  city: string;
  cuisine: string;
  priceRange: number;
  michelinStars: number;
  description: string;
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { restaurantName, city }: RestaurantLookupRequest = await req.json();

    if (!restaurantName || restaurantName.trim().length === 0) {
      throw new Error('Restaurant name is required');
    }

    console.log('Looking up restaurant:', restaurantName, city ? `in ${city}` : '');

    const prompt = `Look up information about the restaurant "${restaurantName}"${city ? ` in ${city}` : ''}. 

Please provide accurate, real information about this restaurant. If you cannot find specific information, indicate low confidence.

Return a JSON object with the following structure:
{
  "name": "Official restaurant name",
  "address": "Full street address",
  "city": "City name",
  "cuisine": "Primary cuisine type (e.g., Italian, French, Japanese, etc.)",
  "priceRange": "Price range from 1-4 (1=budget, 2=moderate, 3=expensive, 4=very expensive)",
  "michelinStars": "Number of Michelin stars (0-3, or 0 if not Michelin starred)",
  "description": "Brief description of the restaurant and its specialties",
  "confidence": "Confidence level from 0-100 (100 = very confident this is accurate information)"
}

Important guidelines:
- For cuisine, use standard categories: American, Italian, French, Chinese, Japanese, Korean, Thai, Vietnamese, Indian, Mexican, Mediterranean, Steakhouse, Seafood, etc.
- For price range: 1 = under $30/person, 2 = $30-60/person, 3 = $60-120/person, 4 = over $120/person
- Only assign Michelin stars if you're confident the restaurant actually has them
- If you can't find the restaurant or are unsure, set confidence to 0-30
- If you find some information but not all, set confidence to 40-70
- If you're very confident about all information, set confidence to 80-100`;

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
            content: 'You are a restaurant information assistant. Provide accurate, real information about restaurants. If you cannot find specific information, be honest about your confidence level.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const restaurantInfo = JSON.parse(data.choices[0].message.content) as RestaurantInfo;

    console.log('Restaurant lookup result:', restaurantInfo);

    // Validate the response structure
    if (!restaurantInfo.name || !restaurantInfo.confidence) {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Ensure numeric values are valid
    restaurantInfo.priceRange = Math.max(1, Math.min(4, restaurantInfo.priceRange || 1));
    restaurantInfo.michelinStars = Math.max(0, Math.min(3, restaurantInfo.michelinStars || 0));
    restaurantInfo.confidence = Math.max(0, Math.min(100, restaurantInfo.confidence || 0));

    return new Response(JSON.stringify({
      success: true,
      data: restaurantInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restaurant-lookup function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to lookup restaurant information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
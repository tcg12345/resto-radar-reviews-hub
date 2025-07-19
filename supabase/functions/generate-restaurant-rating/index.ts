import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RatingRequest {
  restaurantName: string;
  cuisine: string;
}

interface RatingResponse {
  rating: number;
  reasoning: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    if (!claudeApiKey) {
      throw new Error('Claude API key not found');
    }

    const { restaurantName, cuisine }: RatingRequest = await req.json();

    if (!restaurantName || !cuisine) {
      throw new Error('Restaurant name and cuisine are required');
    }

    console.log('Finding accurate rating for restaurant:', restaurantName, 'cuisine:', cuisine);

    const prompt = `You are a restaurant expert. Research and provide an accurate rating for "${restaurantName}" restaurant that serves ${cuisine} cuisine. 

Please provide:
1. A rating out of 10 (as a number)
2. Brief reasoning based on factors like food quality, service, atmosphere, value, and reputation

Consider real reviews, reputation, and quality indicators. Be realistic and fair in your assessment.

Respond in JSON format:
{
  "rating": 8.5,
  "reasoning": "Brief explanation of the rating based on food quality, service, atmosphere, and reputation"
}`;

    console.log('Sending request to Claude for restaurant rating');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        system: 'You are a restaurant expert who provides accurate, fair ratings based on real restaurant quality factors.',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.content[0]?.text;

    console.log('Claude response:', generatedText);

    // Parse the JSON response
    let ratingData: RatingResponse;
    try {
      ratingData = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      throw new Error('Failed to parse rating response');
    }

    // Validate the rating
    if (typeof ratingData.rating !== 'number' || ratingData.rating < 0 || ratingData.rating > 10) {
      throw new Error('Invalid rating received from AI');
    }

    console.log('Successfully generated rating:', ratingData.rating, 'for', restaurantName);

    return new Response(JSON.stringify({
      success: true,
      rating: ratingData.rating,
      reasoning: ratingData.reasoning
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-restaurant-rating function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate restaurant rating'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
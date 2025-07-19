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

async function generateRatingWithClaude(restaurantName: string, cuisine: string): Promise<RatingResponse> {
  const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
  if (!claudeApiKey) {
    throw new Error('Claude API key not found');
  }

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

  console.log('Trying Claude API for restaurant rating');

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
      system: 'You are a restaurant expert who provides accurate, fair ratings based on real restaurant quality factors. Always respond with valid JSON in the exact format requested.',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.content[0]?.text;

  if (!generatedText) {
    throw new Error('No response from Claude');
  }

  console.log('Claude response:', generatedText);

  // Try to parse JSON, with fallback handling
  try {
    const ratingData = JSON.parse(generatedText);
    
    if (typeof ratingData.rating !== 'number' || ratingData.rating < 0 || ratingData.rating > 10) {
      throw new Error('Invalid rating format from Claude');
    }
    
    return ratingData;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', parseError);
    
    // Try to extract rating from text if JSON parsing fails
    const ratingMatch = generatedText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      if (rating >= 0 && rating <= 10) {
        return {
          rating: rating,
          reasoning: generatedText.replace(/[{}"\[\]]/g, '').trim()
        };
      }
    }
    
    throw new Error('Could not extract valid rating from Claude response');
  }
}

async function generateRatingWithOpenAI(restaurantName: string, cuisine: string): Promise<RatingResponse> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not found');
  }

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

  console.log('Using OpenAI API as fallback for restaurant rating');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a restaurant expert who provides accurate, fair ratings based on real restaurant quality factors. Always respond with valid JSON in the exact format requested.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.choices[0].message.content;

  console.log('OpenAI response:', generatedText);

  // Parse the JSON response
  try {
    const ratingData = JSON.parse(generatedText);
    
    if (typeof ratingData.rating !== 'number' || ratingData.rating < 0 || ratingData.rating > 10) {
      throw new Error('Invalid rating format from OpenAI');
    }
    
    return ratingData;
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', parseError);
    
    // Try to extract rating from text if JSON parsing fails
    const ratingMatch = generatedText.match(/(\d+\.?\d*)/);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      if (rating >= 0 && rating <= 10) {
        return {
          rating: rating,
          reasoning: generatedText.replace(/[{}"\[\]]/g, '').trim()
        };
      }
    }
    
    throw new Error('Could not extract valid rating from OpenAI response');
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, cuisine }: RatingRequest = await req.json();

    if (!restaurantName || !cuisine) {
      throw new Error('Restaurant name and cuisine are required');
    }

    console.log('Finding accurate rating for restaurant:', restaurantName, 'cuisine:', cuisine);

    let ratingData: RatingResponse;
    
    try {
      // Try Claude first
      ratingData = await generateRatingWithClaude(restaurantName, cuisine);
      console.log('Successfully generated rating with Claude:', ratingData.rating, 'for', restaurantName);
    } catch (claudeError) {
      console.error('Claude failed, trying OpenAI:', claudeError.message);
      
      try {
        // Fallback to OpenAI
        ratingData = await generateRatingWithOpenAI(restaurantName, cuisine);
        console.log('Successfully generated rating with OpenAI:', ratingData.rating, 'for', restaurantName);
      } catch (openAIError) {
        console.error('Both AI services failed:', openAIError.message);
        throw new Error('Failed to generate rating with both AI services');
      }
    }

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
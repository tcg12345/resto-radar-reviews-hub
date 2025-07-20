import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, address, city, country, cuisine, notes } = await req.json();
    
    console.log('Analyzing restaurant for Michelin stars:', { name, address, city, country });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this restaurant and determine if it has Michelin stars. Be very accurate and only assign stars to restaurants that actually have them.

Restaurant Details:
- Name: ${name}
- Address: ${address}
- City: ${city}
- Country: ${country}
- Cuisine: ${cuisine}
- Notes: ${notes || 'None'}

Instructions:
1. Only assign Michelin stars if you are confident this restaurant actually has them
2. Consider the restaurant's reputation, location, cuisine type, and any notable characteristics
3. Be conservative - it's better to assign 0 stars than to incorrectly assign stars
4. Return only a number: 0, 1, 2, or 3 representing the number of Michelin stars

Respond with ONLY the number of stars (0, 1, 2, or 3) - no explanation needed.`;

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
            content: 'You are an expert on Michelin-starred restaurants worldwide. You have comprehensive knowledge of which restaurants have earned Michelin stars. Only assign stars to restaurants you are confident actually have them.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim();
    
    // Parse the result to ensure it's a valid number between 0-3
    const stars = parseInt(result);
    const michelinStars = (stars >= 0 && stars <= 3) ? stars : 0;
    
    console.log('Michelin stars detected:', michelinStars);

    return new Response(JSON.stringify({ michelinStars }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-michelin-detector function:', error);
    return new Response(JSON.stringify({ error: error.message, michelinStars: null }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
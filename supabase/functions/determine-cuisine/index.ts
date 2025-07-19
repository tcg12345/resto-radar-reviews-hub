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
    console.log('Determine cuisine function called');

    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is not configured');
    }

    const { restaurantName, address, types } = await req.json();
    
    console.log('Processing cuisine determination for:', { restaurantName, address, types });

    const systemPrompt = `You are an expert at identifying restaurant cuisine types. Based on the restaurant name, address, and Google Places types, determine the most accurate single cuisine category.

Return ONLY one of these exact cuisine types (nothing else):
- Italian
- Chinese
- Japanese
- Sushi
- Mexican
- French
- Indian
- Thai
- Mediterranean
- Greek
- Korean
- Vietnamese
- Spanish
- Turkish
- Lebanese
- Steakhouse
- Seafood
- American
- Pizza
- BBQ
- Bakery
- Cafe
- Deli
- Vegetarian
- Fusion
- Middle Eastern
- Latin American
- Contemporary
- Fine Dining

If you're unsure, choose the most likely option. Be as specific as possible (e.g., prefer "Sushi" over "Japanese" if it's a sushi restaurant, "Pizza" over "Italian" if it's primarily pizza).`;

    const userPrompt = `Restaurant Name: ${restaurantName}
Address: ${address || 'Not provided'}
Google Places Types: ${types?.join(', ') || 'Not provided'}

What cuisine type is this restaurant?`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const determinedCuisine = data.choices[0].message.content.trim();

    console.log('Determined cuisine:', determinedCuisine);

    return new Response(JSON.stringify({ 
      cuisine: determinedCuisine,
      restaurantName 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in determine-cuisine function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to determine cuisine',
      details: error.message,
      cuisine: 'American' // fallback
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
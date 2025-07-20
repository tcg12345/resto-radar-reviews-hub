import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurants } = await req.json();

    if (!restaurants || restaurants.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No restaurants provided for cuisine detection' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process restaurants in batches for efficiency
    const batchSize = 10;
    const results = [];

    for (let i = 0; i < restaurants.length; i += batchSize) {
      const batch = restaurants.slice(i, i + batchSize);
      
      const prompt = `Analyze these restaurants and determine their primary cuisine type. Be specific and accurate.

Restaurants:
${batch.map((restaurant: any, index: number) => 
  `${index + 1}. Name: "${restaurant.name}"
     Address: "${restaurant.formatted_address || restaurant.address || ''}"
     Types: ${restaurant.types ? restaurant.types.join(', ') : 'N/A'}`
).join('\n\n')}

For each restaurant, determine the most specific and accurate cuisine type. Use common cuisine categories like:
- Italian, French, Japanese, Chinese, Mexican, Indian, Thai, Mediterranean, American, etc.
- For fusion restaurants, use the primary influence (e.g., "Asian Fusion", "Mediterranean")
- For generic categories, be more specific when possible (e.g., "American" for diners, "International" for eclectic menus)
- If truly unclear, use "International" rather than generic types

Respond with a JSON array in this exact format:
[
  {"index": 0, "cuisine": "Italian"},
  {"index": 1, "cuisine": "Japanese"},
  {"index": 2, "cuisine": "Mexican"}
]`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'You are a cuisine classification expert. Analyze restaurant names and details to determine accurate cuisine types. Always respond with valid JSON only.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
        }),
      });

      const data = await response.json();
      
      try {
        const responseContent = data.choices[0].message.content;
        
        // Extract JSON from markdown code blocks if present
        let jsonString = responseContent;
        const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonString = jsonMatch[1];
        }
        
        const batchResults = JSON.parse(jsonString);
        
        // Map results back to original restaurants with their cuisine
        batchResults.forEach((result: any) => {
          const restaurant = batch[result.index];
          if (restaurant) {
            results.push({
              place_id: restaurant.place_id || restaurant.id,
              name: restaurant.name,
              cuisine: result.cuisine
            });
          }
        });
        
      } catch (parseError) {
        console.error('Error parsing AI response for batch:', parseError);
        console.error('Raw response:', data.choices[0].message.content);
        
        // Fallback: assign "International" to restaurants in this batch
        batch.forEach((restaurant: any) => {
          results.push({
            place_id: restaurant.place_id || restaurant.id,
            name: restaurant.name,
            cuisine: "International"
          });
        });
      }
    }

    console.log(`Processed ${results.length} restaurants for cuisine detection`);

    return new Response(JSON.stringify({
      cuisines: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI cuisine detection:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to detect cuisines' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

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
    const { query, location, userPreferences } = await req.json();

    if (!claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    const systemPrompt = `You are an expert at interpreting restaurant search queries and enhancing them for better results.

Your task is to analyze the user's search query and return enhanced search parameters in JSON format.

User preferences: ${JSON.stringify(userPreferences || {})}

Return your response in this exact JSON structure:
{
  "enhancedQuery": "optimized search query for Google Places API",
  "suggestedCuisines": ["cuisine1", "cuisine2"],
  "suggestedPriceRange": [1, 2, 3, 4],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "any",
  "occasion": "casual" | "romantic" | "business" | "family" | "celebration" | "any",
  "dietaryTags": ["vegetarian", "vegan", "gluten-free", "halal", "kosher"] (if relevant),
  "searchSuggestions": ["alternative query 1", "alternative query 2", "alternative query 3"],
  "interpretation": "Brief explanation of what the user is looking for"
}

Examples:
- "romantic dinner" → enhancedQuery: "fine dining romantic restaurants", occasion: "romantic", mealType: "dinner"
- "quick lunch near me" → enhancedQuery: "fast casual lunch restaurants", occasion: "casual", mealType: "lunch"
- "vegan pizza" → enhancedQuery: "vegan pizza restaurants", dietaryTags: ["vegan"], suggestedCuisines: ["Italian"]

Be intelligent about interpreting context, mood, and intent.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Search query: "${query}"\nLocation: "${location || 'not specified'}"` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const enhancedParamsText = data.content[0]?.text;

    try {
      const enhancedParams = JSON.parse(enhancedParamsText);
      return new Response(JSON.stringify(enhancedParams), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      // Fallback response
      return new Response(JSON.stringify({ 
        enhancedQuery: query,
        suggestedCuisines: [],
        suggestedPriceRange: [1, 2, 3, 4],
        mealType: "any",
        occasion: "any",
        dietaryTags: [],
        searchSuggestions: [],
        interpretation: "Unable to enhance search query"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in AI search enhancer:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      enhancedQuery: query || "",
      suggestedCuisines: [],
      suggestedPriceRange: [1, 2, 3, 4],
      mealType: "any",
      occasion: "any",
      dietaryTags: [],
      searchSuggestions: [],
      interpretation: "Unable to process search query"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
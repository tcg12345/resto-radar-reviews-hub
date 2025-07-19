import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantAnalysisRequest {
  name: string;
  types: string[];
  description?: string;
  address?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { name, types, description, address }: RestaurantAnalysisRequest = await req.json();

    const prompt = `Analyze this restaurant and provide accurate cuisine type and categories:

Restaurant Name: ${name}
Address: ${address || 'Not provided'}
Google Place Types: ${types.join(', ')}
Description: ${description || 'Not provided'}

Based on this information, provide:
1. A specific, accurate cuisine type (e.g., "Modern American", "Authentic Italian", "Korean BBQ", "Molecular Gastronomy", "Traditional French Bistro", etc.)
2. 3-4 relevant, specific categories that describe this restaurant's unique characteristics

Be specific and avoid generic terms. Focus on what makes this restaurant unique.

Respond in this exact JSON format:
{
  "cuisine": "Specific cuisine type",
  "categories": ["Category 1", "Category 2", "Category 3", "Category 4"]
}`;

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
            content: 'You are a restaurant expert who provides accurate cuisine types and categories. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    try {
      const analysis = JSON.parse(analysisText);
      
      return new Response(JSON.stringify({
        success: true,
        cuisine: analysis.cuisine,
        categories: analysis.categories || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      
      // Fallback to basic analysis
      const fallbackCuisine = types.find(type => 
        ['restaurant', 'food', 'establishment'].indexOf(type) === -1
      ) || 'Restaurant';
      
      return new Response(JSON.stringify({
        success: true,
        cuisine: fallbackCuisine.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        categories: types.slice(0, 4).map(type => 
          type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        )
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in restaurant analysis:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantInfoRequest {
  restaurantName: string;
  address?: string;
  city?: string;
  cuisine?: string;
  customInquiry: string;
}

serve(async (req) => {
  console.log('ChatGPT restaurant info function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your Supabase secrets.');
    }

    const { restaurantName, address, city, cuisine, customInquiry }: RestaurantInfoRequest = await req.json();
    
    console.log('Processing restaurant info request:', { restaurantName, address, city, customInquiry });

    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    const restaurantContext = `${restaurantName}${location}${address ? ` (${address})` : ''}${cuisine ? `, a ${cuisine} restaurant` : ''}`;
    
    console.log('ChatGPT query for:', restaurantContext);

    // Use ChatGPT to answer the custom inquiry about the restaurant
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
            content: `You are a helpful restaurant information assistant. Answer questions about restaurants based on general knowledge. Be concise and informative. If you don't have specific current information, say so and provide general guidance. Use bullet points (•) for multiple facts. Keep responses under 4 bullet points.`
          },
          {
            role: 'user',
            content: `Question about ${restaurantContext}: ${customInquiry}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response format from OpenAI API');
      throw new Error('Invalid response format from OpenAI API');
    }

    const generatedInfo = data.choices[0].message.content;
    
    console.log('Successfully generated restaurant info');

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType: 'custom',
      generatedInfo,
      lastUpdated: new Date().toISOString(),
      sources: ['ChatGPT General Knowledge'],
    };

    return new Response(JSON.stringify(structuredInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chatgpt-restaurant-info function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get restaurant information',
      details: error.message,
      restaurantName: '',
      infoType: 'custom',
      generatedInfo: 'Sorry, I could not retrieve information about this restaurant at the moment. Please try again later.',
      lastUpdated: new Date().toISOString(),
      sources: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
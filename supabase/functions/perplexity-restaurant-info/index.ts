import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantInfoRequest {
  restaurantName: string;
  address?: string;
  city?: string;
  infoType: 'current_info' | 'reviews' | 'trending' | 'verification' | 'hours' | 'custom';
  additionalContext?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Perplexity restaurant info function called');
    
    if (!perplexityApiKey) {
      console.error('Perplexity API key is not configured');
      throw new Error('Perplexity API key is not configured. Please add PERPLEXITY_API_KEY to your Supabase secrets.');
    }

    const { restaurantName, address, city, infoType, additionalContext }: RestaurantInfoRequest = await req.json();
    
    console.log('Processing restaurant info request:', { restaurantName, address, city, infoType });

    // Build the query based on the info type
    let query = '';
    let systemPrompt = '';
    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    
    switch (infoType) {
      case 'current_info':
        systemPrompt = 'You are a concise restaurant information assistant. Provide clear, bullet-pointed information. Use format: • Point 1 • Point 2, etc. Keep responses under 150 words.';
        query = `Current key information about ${restaurantName} restaurant ${location}:
        • Current operating status
        • Contact info (phone, website)
        • Notable features or specialties
        • Recent changes or updates`;
        break;
      case 'reviews':
        systemPrompt = 'You are a review summarizer. Provide a concise summary of recent reviews. Use format: Overall: [rating/sentiment] • Highlights: [3-4 key points] • Recent feedback: [1-2 current observations]';
        query = `Recent review summary for ${restaurantName} restaurant ${location}. Focus on 2024 feedback about food quality, service, and overall experience.`;
        break;
      case 'trending':
        systemPrompt = 'You are a trending food news assistant. Provide brief, factual updates. Use format: • Current status • Recent mentions • Notable developments. Keep under 100 words.';
        query = `Current trending status for ${restaurantName} restaurant ${location}. Any recent awards, media mentions, or buzz in 2024?`;
        break;
      case 'verification':
        systemPrompt = 'You are a restaurant verification assistant. Provide factual verification in clear format: • Status: [Open/Closed] • Address: [current address] • Phone: [number] • Hours: [brief schedule] • Website: [URL if available]';
        query = `Verify current operational details for ${restaurantName} restaurant ${location}. Confirm if open, correct address, phone, and hours.`;
        break;
      case 'hours':
        systemPrompt = 'You are a restaurant hours assistant. Provide current hours in clear format: • Monday: [hours] • Tuesday: [hours] etc. If hours vary or are unclear, state that clearly.';
        query = `Current operating hours for ${restaurantName} restaurant ${location}. Provide specific daily hours.`;
        break;
      case 'custom':
        systemPrompt = 'You are a helpful restaurant information assistant. Provide clear, concise answers. Use bullet points when appropriate. Keep responses focused and under 200 words.';
        query = additionalContext || `Information about ${restaurantName} restaurant ${location}`;
        break;
      default:
        systemPrompt = 'You are a helpful restaurant information assistant. Provide clear, concise answers using bullet points where appropriate.';
        query = `Information about ${restaurantName} restaurant ${location}`;
    }

    if (additionalContext) {
      query += ` ${additionalContext}`;
    }

    console.log('Perplexity query:', query);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      console.error('Perplexity API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Perplexity API response received');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response format from Perplexity API');
      throw new Error('Invalid response format from Perplexity API');
    }

    const generatedInfo = data.choices[0].message.content;

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType,
      generatedInfo,
      lastUpdated: new Date().toISOString(),
      sources: data.citations || [],
    };

    console.log('Successfully generated restaurant info');

    return new Response(JSON.stringify(structuredInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in perplexity-restaurant-info function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get restaurant information',
      details: error.message,
      restaurantName: '',
      infoType: '',
      generatedInfo: '',
      lastUpdated: new Date().toISOString(),
      sources: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
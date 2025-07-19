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
  infoType: 'current_info' | 'reviews' | 'trending' | 'verification' | 'hours';
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
    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    
    switch (infoType) {
      case 'current_info':
        query = `Current information about ${restaurantName} restaurant ${location}. Include current hours, menu highlights, recent changes, contact information, and any notable recent news or updates.`;
        break;
      case 'reviews':
        query = `Recent reviews and ratings for ${restaurantName} restaurant ${location}. What are people saying about the food, service, and experience? Include recent feedback from 2024.`;
        break;
      case 'trending':
        query = `Is ${restaurantName} restaurant ${location} currently trending or popular? Any recent buzz, awards, or mentions in food blogs, social media, or news?`;
        break;
      case 'verification':
        query = `Verify current details for ${restaurantName} restaurant ${location}. Confirm if the restaurant is still open, current address, phone number, website, and operating hours.`;
        break;
      case 'hours':
        query = `Current operating hours for ${restaurantName} restaurant ${location}. What are the specific hours for each day of the week?`;
        break;
      default:
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
            content: 'You are a helpful assistant that provides current, accurate information about restaurants. Be precise and include specific details like hours, contact info, and recent updates when available. Format your response in a clear, structured way.'
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
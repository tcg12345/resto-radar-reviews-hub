import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
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

async function getRestaurantInfoWithClaude(restaurantContext: string, customInquiry: string): Promise<string> {
  if (!claudeApiKey) {
    throw new Error('Claude API key not configured');
  }

  console.log('Trying Claude API for restaurant info');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${claudeApiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      system: `You are a helpful restaurant information assistant. Answer questions about restaurants based on general knowledge. Be concise and informative. If you don't have specific current information, say so and provide general guidance. Use bullet points (•) for multiple facts. Keep responses under 4 bullet points.`,
      messages: [
        {
          role: 'user',
          content: `Question about ${restaurantContext}: ${customInquiry}`
        }
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

  if (!data.content || !data.content[0] || !data.content[0].text) {
    throw new Error('Invalid response format from Claude API');
  }

  return data.content[0].text;
}

async function getRestaurantInfoWithOpenAI(restaurantContext: string, customInquiry: string): Promise<string> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('Using OpenAI API as fallback for restaurant info');

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
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response format from OpenAI API');
  }

  return data.choices[0].message.content;
}

serve(async (req) => {
  console.log('Restaurant info function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, address, city, cuisine, customInquiry }: RestaurantInfoRequest = await req.json();
    
    console.log('Processing restaurant info request:', { restaurantName, address, city, customInquiry });

    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    const restaurantContext = `${restaurantName}${location}${address ? ` (${address})` : ''}${cuisine ? `, a ${cuisine} restaurant` : ''}`;
    
    console.log('Query for:', restaurantContext);

    let generatedInfo: string;

    try {
      // Try Claude first
      generatedInfo = await getRestaurantInfoWithClaude(restaurantContext, customInquiry);
      console.log('Successfully got info with Claude');
    } catch (claudeError) {
      console.error('Claude failed, trying OpenAI:', claudeError.message);
      
      try {
        // Fallback to OpenAI
        generatedInfo = await getRestaurantInfoWithOpenAI(restaurantContext, customInquiry);
        console.log('Successfully got info with OpenAI');
      } catch (openAIError) {
        console.error('Both AI services failed:', openAIError.message);
        throw new Error('Failed to get restaurant information with both AI services');
      }
    }
    
    console.log('Successfully generated restaurant info');

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType: 'custom',
      generatedInfo,
      lastUpdated: new Date().toISOString(),
      sources: ['AI Assistant'],
    };

    return new Response(JSON.stringify(structuredInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in restaurant-info function:', error);
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
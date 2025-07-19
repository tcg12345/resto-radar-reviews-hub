import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');

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
    console.log('Claude restaurant info function called');
    
    if (!claudeApiKey) {
      console.error('Claude API key is not configured');
      throw new Error('Claude API key is not configured. Please add CLAUDE_API_KEY to your Supabase secrets.');
    }

    const { restaurantName, address, city, infoType, additionalContext }: RestaurantInfoRequest = await req.json();
    
    console.log('Processing restaurant info request:', { restaurantName, address, city, infoType });

    // Build the query based on the info type
    let systemPrompt = '';
    let userPrompt = '';
    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    const restaurantContext = `${restaurantName}${location}${address ? ` (${address})` : ''}`;
    
    switch (infoType) {
      case 'current_info':
        systemPrompt = 'You are a restaurant information expert. Provide comprehensive, accurate information about restaurants based on your knowledge. Be specific and helpful.';
        userPrompt = `Provide comprehensive current information about ${restaurantContext}: operating status, contact details, specialties, recent updates, awards, news, changes, anything current and relevant.`;
        break;
      case 'reviews':
        systemPrompt = 'You are a restaurant review expert. Provide detailed analysis and summary of restaurant reviews and customer feedback.';
        userPrompt = `Provide detailed review analysis for ${restaurantContext}: customer feedback, ratings, what people say about food, service, atmosphere, recent experiences.`;
        break;
      case 'trending':
        systemPrompt = 'You are a restaurant trend expert. Provide information about current popularity, buzz, and trending status of restaurants.';
        userPrompt = `Is ${restaurantContext} trending? Any recent awards, media mentions, social media buzz, popularity, waiting times, reservations difficulty?`;
        break;
      case 'verification':
        systemPrompt = 'You are a restaurant verification expert. Provide accurate current details for restaurant verification.';
        userPrompt = `Verify and provide all current details for ${restaurantContext}: address, phone, hours, website, social media, current status.`;
        break;
      case 'hours':
        systemPrompt = 'You are a restaurant hours expert. Provide comprehensive current operating hours and schedule information. Format hours clearly with specific times.';
        userPrompt = `Complete detailed operating hours for ${restaurantContext}: exact daily hours, special schedules, current hours today, any recent changes to hours, holiday schedules.`;
        break;
      case 'custom':
        systemPrompt = `You are a restaurant information expert. Provide comprehensive, detailed, current information about ${restaurantContext} related to this specific question: "${additionalContext}".`;
        userPrompt = `Current detailed information about ${restaurantContext}: ${additionalContext || 'general information'}`;
        break;
      default:
        systemPrompt = 'You are a restaurant information expert. Provide comprehensive information about restaurants.';
        userPrompt = `Comprehensive information about ${restaurantContext}`;
    }

    if (additionalContext && infoType !== 'custom') {
      userPrompt += ` ${additionalContext}`;
    }

    console.log('Claude query:', userPrompt);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Claude API response received');

    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error('Invalid response format from Claude API');
      throw new Error('Invalid response format from Claude API');
    }

    const rawClaudeInfo = data.content[0].text;
    
    console.log('Claude response received, formatting...');

    // Format the response for better readability
    let formattedInfo = rawClaudeInfo;
    
    // For hours specifically, format nicely
    if (infoType === 'hours' || (additionalContext && additionalContext.toLowerCase().includes('hour'))) {
      // Keep hours formatting simple and clean
      formattedInfo = rawClaudeInfo;
    } else {
      // Use bullet points for other information
      formattedInfo = rawClaudeInfo
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold markdown
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic markdown
        .replace(/\*/g, '')                 // Remove any remaining asterisks
        .replace(/\s+/g, ' ')               // Normalize spaces
        .trim();
    }
    
    console.log('Successfully formatted response');

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType,
      generatedInfo: formattedInfo,
      lastUpdated: new Date().toISOString(),
      sources: ['Claude AI'],
    };

    console.log('Successfully generated restaurant info');

    return new Response(JSON.stringify(structuredInfo), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in claude-restaurant-info function:', error);
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

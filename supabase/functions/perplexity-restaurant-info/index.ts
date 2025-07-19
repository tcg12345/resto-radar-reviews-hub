import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

    if (!openAIApiKey) {
      console.error('OpenAI API key is not configured');
      throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your Supabase secrets.');
    }

    const { restaurantName, address, city, infoType, additionalContext }: RestaurantInfoRequest = await req.json();
    
    console.log('Processing restaurant info request:', { restaurantName, address, city, infoType });

    // Build the query based on the info type
    let query = '';
    let systemPrompt = '';
    const location = city ? `in ${city}` : (address ? `at ${address}` : '');
    const restaurantContext = `${restaurantName}${location}${address ? ` (${address})` : ''}`;
    
    switch (infoType) {
      case 'current_info':
        systemPrompt = 'Get comprehensive current information about this restaurant. Include everything you can find: status, contact info, specialties, recent news, awards, changes, etc.';
        query = `Comprehensive current information about ${restaurantContext}: operating status, contact details, specialties, recent updates, awards, news, changes, anything current and relevant.`;
        break;
      case 'reviews':
        systemPrompt = 'Get detailed recent review information about this restaurant from multiple sources.';
        query = `Detailed recent review analysis for ${restaurantContext}: customer feedback, ratings, what people say about food, service, atmosphere, recent experiences.`;
        break;
      case 'trending':
        systemPrompt = 'Get comprehensive information about current trends, mentions, buzz, and popularity.';
        query = `Is ${restaurantContext} trending? Any recent awards, media mentions, social media buzz, popularity, waiting times, reservations difficulty in 2024?`;
        break;
      case 'verification':
        systemPrompt = 'Get comprehensive verification details for this restaurant.';
        query = `Verify and get all current details for ${restaurantContext}: address, phone, hours, website, social media, current status.`;
        break;
      case 'hours':
        systemPrompt = 'Get comprehensive current operating hours and schedule information for this restaurant. Look for detailed hour information from multiple sources including Google, their website, and recent mentions.';
        query = `Complete detailed operating hours for ${restaurantContext}: exact daily hours, special schedules, current hours today, any recent changes to hours, holiday schedules.`;
        break;
      case 'custom':
        // For custom queries, get comprehensive information first
        systemPrompt = `Get comprehensive, detailed, current information about ${restaurantContext} related to this specific question: "${additionalContext}". Search multiple sources including Google, their website, recent reviews, and current information.`;
        query = `Current detailed information about ${restaurantContext}: ${additionalContext || 'general information'}`;
        break;
      default:
        systemPrompt = 'Get comprehensive information about this restaurant.';
        query = `Comprehensive information about ${restaurantContext}`;
    }

    if (additionalContext && infoType !== 'custom') {
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

    const rawPerplexityInfo = data.choices[0].message.content;
    
    console.log('Raw Perplexity response received, now formatting with ChatGPT...');

    // Now use ChatGPT to format the Perplexity information into a clear, concise, visually appealing response
    const formatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Format restaurant information clearly and concisely. ${infoType === 'custom' && (additionalContext || '').toLowerCase().includes('hour') ? 
`Format hours EXACTLY like this:
Monday: 11:45 AM–2:15 PM, 5:30–9:45 PM
Tuesday: 5:30–10:45 PM  
Wednesday: Closed

Only show hours. If unclear, say "Hours not clearly available - call restaurant."` :
`Use bullet points (•) with one key fact per line. Maximum 4 points. No asterisks, no bold text, no formatting symbols. Be direct and factual.`}`
          },
          {
            role: 'user',
            content: rawPerplexityInfo
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!formatResponse.ok) {
      console.error('OpenAI formatting error:', formatResponse.status);
      // Fallback to original Perplexity response if ChatGPT fails
      const cleanedInfo = rawPerplexityInfo
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold markdown
        .replace(/\*([^*]+)\*/g, '$1')      // Remove italic markdown
        .replace(/\[(\d+)\]/g, '')          // Remove citation numbers
        .replace(/\*/g, '')                 // Remove any remaining asterisks
        .replace(/\[\d+\]\[\d+\]/g, '')     // Remove citation patterns
        .replace(/\s+/g, ' ')               // Normalize spaces
        .trim();
      
      return new Response(JSON.stringify({
        restaurantName,
        infoType,
        generatedInfo: cleanedInfo,
        lastUpdated: new Date().toISOString(),
        sources: data.citations || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formatData = await formatResponse.json();
    const formattedInfo = formatData.choices[0].message.content;
    
    console.log('Successfully formatted with ChatGPT');

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType,
      generatedInfo: formattedInfo,
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
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RestaurantInfo {
  name: string;
  address?: string;
  city?: string;
  country?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurant }: { restaurant: RestaurantInfo } = await req.json();

    if (!restaurant?.name) {
      throw new Error('Restaurant name is required');
    }

    console.log('Finding reservation link for restaurant:', restaurant);

    const searchQuery = `Find the direct reservation booking link for "${restaurant.name}" ${restaurant.address || restaurant.city} on OpenTable, Resy, SevenRooms, or Tock. Provide only the working URL if found.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a reservation link finder. Search for direct booking links on OpenTable, Resy, SevenRooms, or Tock. Only return real, working URLs. If you cannot find a verified working link, respond with "NOT_FOUND". Do not guess or generate URLs.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: 200,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Perplexity API error:', error);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    console.log('Perplexity response:', content);

    // Extract URL from response
    let reservationUrl = null;
    let platform = null;

    // Look for URLs in the response
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const urls = content.match(urlRegex);

    if (urls && urls.length > 0) {
      for (const url of urls) {
        // Verify it's a reservation platform URL
        if (url.includes('opentable.com') || 
            url.includes('resy.com') || 
            url.includes('sevenrooms.com') ||
            url.includes('exploretock.com')) {
          reservationUrl = url;
          
          if (url.includes('opentable.com')) platform = 'OpenTable';
          else if (url.includes('resy.com')) platform = 'Resy';
          else if (url.includes('sevenrooms.com')) platform = 'SevenRooms';
          else if (url.includes('exploretock.com')) platform = 'Tock';
          
          break;
        }
      }
    }

    // If no URL found or content indicates not found
    if (!reservationUrl || content.includes('NOT_FOUND') || content.toLowerCase().includes('not found') || content.toLowerCase().includes('no direct')) {
      console.log('No reservation URL found for:', restaurant.name);
      return new Response(JSON.stringify({ 
        reservationUrl: null,
        platform: null,
        found: false,
        reasoning: 'No verified reservation link found on major platforms'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = {
      reservationUrl,
      platform,
      found: true,
      reasoning: `Found working reservation link on ${platform}`
    };

    console.log('Found reservation link:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-reservation-finder function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      reservationUrl: null,
      platform: null,
      found: false,
      reasoning: 'Error occurred during search'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
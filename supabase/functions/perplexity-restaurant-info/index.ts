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
    const restaurantContext = `${restaurantName}${location}${address ? ` (${address})` : ''}`;
    
    switch (infoType) {
      case 'current_info':
        systemPrompt = 'Provide only key facts in 3-4 bullet points. Format: • Fact 1 • Fact 2 • Fact 3. Max 80 words total.';
        query = `Key current facts about ${restaurantContext}: operating status, phone/website, main specialties, any recent updates.`;
        break;
      case 'reviews':
        systemPrompt = 'Summarize in 3 bullet points: • Overall sentiment • Top praised items • Recent concerns (if any). Max 60 words.';
        query = `Recent 2024 review summary for ${restaurantContext}.`;
        break;
      case 'trending':
        systemPrompt = 'Answer in 2-3 bullet points. • Current status • Recent mentions. Max 50 words.';
        query = `Is ${restaurantContext} trending? Any recent awards, media mentions, or buzz in 2024?`;
        break;
      case 'verification':
        systemPrompt = 'Verify in bullet format: • Status: Open/Closed • Address: [current] • Phone: [number] • Hours: [brief]. Max 60 words.';
        query = `Verify current details for ${restaurantContext}.`;
        break;
      case 'hours':
        systemPrompt = 'List current hours in format: • Mon-Fri: [hours] • Sat: [hours] • Sun: [hours] OR daily breakdown. Max 40 words.';
        query = `Current hours for ${restaurantContext}.`;
        break;
      case 'custom':
        systemPrompt = `Answer specifically about ${restaurantContext}. Be concise, direct, and factual. Max 100 words.`;
        query = `About ${restaurantContext}: ${additionalContext || 'general information'}`;
        break;
      default:
        systemPrompt = 'Provide clear, concise information in bullet points.';
        query = `Information about ${restaurantContext}`;
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
    
    // Clean up the response: remove markdown formatting and source citations
    const cleanedInfo = generatedInfo
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold markdown **text**
      .replace(/\*([^*]+)\*/g, '$1')      // Remove italic markdown *text*
      .replace(/\[(\d+)\]/g, '')          // Remove source citations [1], [2], etc.
      .replace(/\[\d+\]\[\d+\]/g, '')     // Remove multiple citations [1][2]
      .replace(/\s+/g, ' ')               // Clean up extra whitespace
      .trim();

    // Parse the response to extract structured information
    const structuredInfo = {
      restaurantName,
      infoType,
      generatedInfo: cleanedInfo,
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
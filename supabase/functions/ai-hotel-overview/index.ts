import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const { hotel } = await req.json();

    if (!hotel || !hotel.name) {
      return new Response(
        JSON.stringify({ error: 'Hotel information is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Build context for the AI based on available hotel data
    let hotelContext = `Hotel Name: ${hotel.name}`;
    if (hotel.address) hotelContext += `\nAddress: ${hotel.address}`;
    if (hotel.rating) hotelContext += `\nRating: ${hotel.rating}/5`;
    if (hotel.priceRange) hotelContext += `\nPrice Range: ${hotel.priceRange}`;
    if (hotel.amenities && hotel.amenities.length > 0) {
      hotelContext += `\nAmenities: ${hotel.amenities.join(', ')}`;
    }

    console.log('Generating overview for hotel:', hotel.name);

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
            content: `You are a professional travel writer who creates engaging, detailed hotel overviews. Write compelling descriptions that help travelers understand what makes each hotel special. Focus on atmosphere, location benefits, guest experience, and unique features. Keep the tone professional yet inviting, and make it 2-3 paragraphs long.`
          },
          {
            role: 'user',
            content: `Create a detailed, engaging overview for this hotel based on the following information:\n\n${hotelContext}\n\nWrite a comprehensive description that covers the hotel's atmosphere, location advantages, amenities, and what guests can expect from their stay. Make it informative and appealing to potential guests.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate hotel overview' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const overview = data.choices[0].message.content;

    console.log('Successfully generated overview for:', hotel.name);

    return new Response(
      JSON.stringify({ overview }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-hotel-overview function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
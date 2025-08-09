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
    const { hotel, detailed = false } = await req.json();

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

    console.log(`Generating ${detailed ? 'detailed' : 'short'} overview for hotel:`, hotel.name);

    const systemPrompt = detailed 
      ? `You are an expert travel writer specializing in luxury hospitality. Create highly detailed, immersive hotel descriptions that paint a vivid picture of the guest experience. Focus on specific architectural details, interior design elements, service quality, neighborhood characteristics, dining experiences, and unique selling points. Write in an engaging, descriptive style that helps readers visualize their stay. Be specific about room features, public spaces, service offerings, and local attractions. Make each description feel personalized and distinctive.`
      : `You are a travel expert who creates concise, compelling hotel summaries. Write brief but engaging descriptions that capture the essence of each hotel in 1-2 sentences. Focus on the most distinctive features and main appeal.`;

    const userPrompt = detailed 
      ? `Create an exceptionally detailed and personalized overview for this hotel. Use the provided information to craft a rich, immersive description:\n\n${hotelContext}\n\nPlease include:
- Specific details about the hotel's architecture, design, and ambiance
- Detailed room descriptions and guest experience
- In-depth coverage of amenities and their unique features
- Neighborhood characteristics and local attractions within walking distance
- Dining options and culinary experiences
- Service quality and staff expertise
- What makes this particular hotel unique compared to others
- Specific benefits for different types of travelers (business, leisure, couples, families)
- Seasonal considerations and best times to visit
- Any historical or cultural significance of the location

Write 4-5 detailed paragraphs that make potential guests excited about staying here. Be specific, vivid, and compelling.`
      : `Create a brief, compelling summary for this hotel in 1-2 sentences:\n\n${hotelContext}\n\nCapture the hotel's main appeal and most distinctive features. Make it engaging and enticing while keeping it concise.`;

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: detailed ? 800 : 150,
        temperature: 0.8,
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
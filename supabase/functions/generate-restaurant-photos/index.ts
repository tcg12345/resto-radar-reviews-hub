import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoGenerationRequest {
  restaurantName: string;
  cuisine: string;
}

interface GeneratedPhoto {
  url: string;
  type: 'atmosphere' | 'food';
  description: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const { restaurantName, cuisine }: PhotoGenerationRequest = await req.json();

    if (!restaurantName || !cuisine) {
      throw new Error('Restaurant name and cuisine are required');
    }

    console.log('Generating photos for restaurant:', restaurantName, 'cuisine:', cuisine);

    const photos: GeneratedPhoto[] = [];

    // Generate atmosphere photo
    const atmospherePrompt = `A beautiful, inviting interior view of ${restaurantName}, a ${cuisine} restaurant. Show elegant dining room with warm lighting, comfortable seating, and sophisticated decor that reflects the ${cuisine} cuisine style. High-quality restaurant photography, professional lighting, inviting atmosphere.`;

    console.log('Generating atmosphere photo with prompt:', atmospherePrompt);

    const atmosphereResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: atmospherePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp'
      }),
    });

    if (!atmosphereResponse.ok) {
      const errorText = await atmosphereResponse.text();
      console.error('OpenAI API error for atmosphere:', errorText);
      throw new Error(`OpenAI API error: ${atmosphereResponse.status}`);
    }

    const atmosphereData = await atmosphereResponse.json();
    if (atmosphereData.data && atmosphereData.data[0]) {
      photos.push({
        url: `data:image/webp;base64,${atmosphereData.data[0].b64_json}`,
        type: 'atmosphere',
        description: 'Restaurant interior atmosphere'
      });
    }

    // Generate food photo
    const foodPrompt = `A beautifully plated signature dish from ${restaurantName}, showcasing the best of ${cuisine} cuisine. Professional food photography, elegant presentation, garnished and styled perfectly, high-quality restaurant dish, vibrant colors, appetizing appearance.`;

    console.log('Generating food photo with prompt:', foodPrompt);

    const foodResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: foodPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        output_format: 'webp'
      }),
    });

    if (!foodResponse.ok) {
      const errorText = await foodResponse.text();
      console.error('OpenAI API error for food:', errorText);
      throw new Error(`OpenAI API error: ${foodResponse.status}`);
    }

    const foodData = await foodResponse.json();
    if (foodData.data && foodData.data[0]) {
      photos.push({
        url: `data:image/webp;base64,${foodData.data[0].b64_json}`,
        type: 'food',
        description: 'Restaurant signature dish'
      });
    }

    console.log('Successfully generated', photos.length, 'photos');

    return new Response(JSON.stringify({
      success: true,
      images: photos
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-restaurant-photos function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to generate restaurant photos'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
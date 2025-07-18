import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoSearchRequest {
  restaurantName: string;
  cuisine: string;
}

interface RestaurantPhoto {
  url: string;
  type: 'atmosphere' | 'food';
  description: string;
}

async function searchImages(query: string): Promise<string[]> {
  try {
    // Using DuckDuckGo API for image search - it's free and doesn't require API keys
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&t=lovable-app`);
    
    if (!response.ok) {
      throw new Error(`Search API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract image URLs from search results
    const imageUrls: string[] = [];
    
    // Try to get images from the results
    if (data.Results && data.Results.length > 0) {
      for (const result of data.Results.slice(0, 3)) {
        if (result.Image && result.Image.startsWith('http')) {
          imageUrls.push(result.Image);
        }
      }
    }
    
    return imageUrls;
  } catch (error) {
    console.error('Error searching for images:', error);
    return [];
  }
}

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Detect content type from response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error downloading image:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { restaurantName, cuisine }: PhotoSearchRequest = await req.json();

    if (!restaurantName || !cuisine) {
      throw new Error('Restaurant name and cuisine are required');
    }

    console.log('Searching for photos of restaurant:', restaurantName, 'cuisine:', cuisine);

    const photos: RestaurantPhoto[] = [];

    // Search for restaurant atmosphere photos
    const atmosphereQuery = `${restaurantName} restaurant interior dining room atmosphere`;
    console.log('Searching for atmosphere photos with query:', atmosphereQuery);
    
    const atmosphereUrls = await searchImages(atmosphereQuery);
    
    if (atmosphereUrls.length > 0) {
      const atmosphereImageData = await downloadImageAsBase64(atmosphereUrls[0]);
      if (atmosphereImageData) {
        photos.push({
          url: atmosphereImageData,
          type: 'atmosphere',
          description: 'Restaurant interior atmosphere'
        });
      }
    }

    // Search for restaurant food photos
    const foodQuery = `${restaurantName} restaurant food dish ${cuisine} cuisine`;
    console.log('Searching for food photos with query:', foodQuery);
    
    const foodUrls = await searchImages(foodQuery);
    
    if (foodUrls.length > 0) {
      const foodImageData = await downloadImageAsBase64(foodUrls[0]);
      if (foodImageData) {
        photos.push({
          url: foodImageData,
          type: 'food',
          description: 'Restaurant signature dish'
        });
      }
    }

    console.log('Successfully found', photos.length, 'photos');

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
      error: error.message || 'Failed to find restaurant photos'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
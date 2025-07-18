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

function getRestaurantPhotos(searchType: 'atmosphere' | 'food'): string[] {
  // Return curated restaurant photos from reliable sources
  if (searchType === 'atmosphere') {
    return [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80'
    ];
  } else {
    return [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2080&q=80',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2081&q=80',
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2087&q=80'
    ];
  }
}

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log('Downloading image from:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Get content type from response headers
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

    console.log('Finding photos for restaurant:', restaurantName, 'cuisine:', cuisine);

    const photos: RestaurantPhoto[] = [];

    // Get restaurant atmosphere photos
    const atmosphereUrls = getRestaurantPhotos('atmosphere');
    console.log('Processing atmosphere photo from:', atmosphereUrls[0]);
    
    const atmosphereImageData = await downloadImageAsBase64(atmosphereUrls[0]);
    if (atmosphereImageData) {
      photos.push({
        url: atmosphereImageData,
        type: 'atmosphere',
        description: 'Restaurant interior atmosphere'
      });
      console.log('Successfully processed atmosphere photo');
    }

    // Get restaurant food photos
    const foodUrls = getRestaurantPhotos('food');
    console.log('Processing food photo from:', foodUrls[0]);
    
    const foodImageData = await downloadImageAsBase64(foodUrls[0]);
    if (foodImageData) {
      photos.push({
        url: foodImageData,
        type: 'food',
        description: 'Restaurant signature dish'
      });
      console.log('Successfully processed food photo');
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
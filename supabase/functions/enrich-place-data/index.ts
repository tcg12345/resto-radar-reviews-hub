import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichPlaceRequest {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}

interface EnrichPlaceResponse {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  placeId?: string;
  priceLevel?: number;
  rating?: number;
  types?: string[];
  latitude?: number;
  longitude?: number;
  photos?: string[];
  openingHours?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, address, phone, website, placeId, latitude, longitude }: EnrichPlaceRequest = await req.json();

    if (!googleApiKey) {
      throw new Error('Google Places API key not configured');
    }

    let enrichedData: EnrichPlaceResponse = {
      name,
      address: address || '',
      phone,
      website,
      placeId,
      latitude,
      longitude,
    };

    // First, try to get place details if we have a placeId
    if (placeId) {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,price_level,rating,types,geometry,photos,opening_hours&key=${googleApiKey}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();
      
      if (detailsData.status === 'OK' && detailsData.result) {
        const result = detailsData.result;
        enrichedData = {
          name: result.name || name,
          address: result.formatted_address || address || '',
          phone: result.formatted_phone_number || phone,
          website: result.website || website,
          placeId,
          priceLevel: result.price_level,
          rating: result.rating,
          types: result.types,
          latitude: result.geometry?.location?.lat || latitude,
          longitude: result.geometry?.location?.lng || longitude,
          photos: result.photos?.slice(0, 3).map((photo: any) => 
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
          ),
          openingHours: result.opening_hours?.weekday_text,
        };
      }
    } else {
      // If no placeId, try to find the place using text search
      const searchQuery = `${name} ${address || ''}`.trim();
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&fields=place_id,name,formatted_address,formatted_phone_number,website,price_level,rating,types,geometry,photos&key=${googleApiKey}`;
      
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();
      
      if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
        const result = searchData.results[0];
        
        // Get detailed information using the found place_id
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&fields=name,formatted_address,formatted_phone_number,website,price_level,rating,types,geometry,photos,opening_hours&key=${googleApiKey}`;
        
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        
        if (detailsData.status === 'OK' && detailsData.result) {
          const detailResult = detailsData.result;
          enrichedData = {
            name: detailResult.name || name,
            address: detailResult.formatted_address || address || '',
            phone: detailResult.formatted_phone_number || phone,
            website: detailResult.website || website,
            placeId: result.place_id,
            priceLevel: detailResult.price_level,
            rating: detailResult.rating,
            types: detailResult.types,
            latitude: detailResult.geometry?.location?.lat || latitude,
            longitude: detailResult.geometry?.location?.lng || longitude,
            photos: detailResult.photos?.slice(0, 3).map((photo: any) => 
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
            ),
            openingHours: detailResult.opening_hours?.weekday_text,
          };
        }
      }
    }

    return new Response(JSON.stringify(enrichedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enrich-place-data:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      // Return original data if enrichment fails
      name: (await req.json()).name,
      address: (await req.json()).address || '',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
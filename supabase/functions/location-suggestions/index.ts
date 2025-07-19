import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationSuggestionsRequest {
  input: string;
  limit?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!googlePlacesApiKey) {
      throw new Error('Google Places API key not found');
    }

    const { input, limit = 5 }: LocationSuggestionsRequest = await req.json();

    if (!input || input.trim().length < 2) {
      return new Response(JSON.stringify({
        success: true,
        suggestions: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Getting location suggestions for:', input);

    // Use Google Places Autocomplete API for location suggestions
    const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${googlePlacesApiKey}`;

    const response = await fetch(autocompleteUrl);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places Autocomplete API error:', data);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const suggestions = data.predictions?.slice(0, limit).map((prediction: any) => ({
      id: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || prediction.description,
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    })) || [];

    console.log(`Found ${suggestions.length} location suggestions`);

    return new Response(JSON.stringify({
      success: true,
      suggestions
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in location suggestions:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to get location suggestions'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
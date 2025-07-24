import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface PointOfInterestRequest {
  latitude: number;
  longitude: number;
  radius?: number;
  categories?: string[];
}

// Get Amadeus access token
async function getAmadeusToken(): Promise<string> {
  const apiKey = Deno.env.get('AMADEUS_API_KEY');
  const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
  
  if (!apiKey || !apiSecret) {
    throw new Error('Amadeus API credentials not configured');
  }

  const tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get Amadeus token: ${response.statusText}`);
  }

  const tokenData: AmadeusTokenResponse = await response.json();
  return tokenData.access_token;
}

// Get points of interest (restaurants, attractions) near a location
async function getPointsOfInterest(token: string, params: PointOfInterestRequest) {
  const { latitude, longitude, radius = 5, categories = ['RESTAURANT'] } = params;
  
  const url = new URL('https://test.api.amadeus.com/v1/reference-data/locations/pois');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('radius', radius.toString());
  url.searchParams.set('categories', categories.join(','));
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get points of interest: ${response.statusText}`);
  }

  return await response.json();
}

// Search for cities (for location autocomplete)
async function searchCities(token: string, keyword: string) {
  const url = new URL('https://test.api.amadeus.com/v1/reference-data/locations/cities');
  url.searchParams.set('keyword', keyword);
  url.searchParams.set('max', '10');
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search cities: ${response.statusText}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Amadeus API function called')
    
    // Parse request body to get endpoint type
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { endpoint } = requestBody;
    
    // Get access token
    const token = await getAmadeusToken();
    console.log('Successfully obtained Amadeus access token')

    switch (endpoint) {
      case 'points-of-interest': {
        const { latitude, longitude, radius, categories } = requestBody;
        
        if (!latitude || !longitude) {
          return new Response(
            JSON.stringify({ error: 'Latitude and longitude are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await getPointsOfInterest(token, { latitude, longitude, radius, categories });
        
        return new Response(
          JSON.stringify(data),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'search-cities': {
        const { keyword } = requestBody;
        
        if (!keyword) {
          return new Response(
            JSON.stringify({ error: 'Keyword is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await searchCities(token, keyword);
        
        return new Response(
          JSON.stringify(data),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid endpoint',
            available_endpoints: [
              'points-of-interest - Get restaurants and POIs near a location',
              'search-cities - Search for cities'
            ]
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in Amadeus API function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
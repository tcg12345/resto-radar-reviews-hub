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
    
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();
    
    // Get access token
    const token = await getAmadeusToken();
    console.log('Successfully obtained Amadeus access token')

    switch (endpoint) {
      case 'points-of-interest': {
        if (req.method !== 'POST') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const body: PointOfInterestRequest = await req.json();
        const data = await getPointsOfInterest(token, body);
        
        return new Response(
          JSON.stringify(data),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      case 'search-cities': {
        if (req.method !== 'GET') {
          return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const keyword = url.searchParams.get('keyword');
        if (!keyword) {
          return new Response(
            JSON.stringify({ error: 'Keyword parameter is required' }),
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
            error: 'Endpoint not found',
            available_endpoints: [
              'POST /points-of-interest - Get restaurants and POIs near a location',
              'GET /search-cities?keyword=query - Search for cities'
            ]
          }),
          { 
            status: 404, 
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
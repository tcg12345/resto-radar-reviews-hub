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

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  flightNumber?: string;
  airline?: string;
}

// Get Amadeus access token
async function getAmadeusToken(): Promise<string> {
  const apiKey = Deno.env.get('AMADEUS_API_KEY');
  const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
  
  console.log('API Key exists:', !!apiKey);
  console.log('API Secret exists:', !!apiSecret);
  
  if (!apiKey || !apiSecret) {
    console.error('Missing Amadeus credentials - API Key:', !!apiKey, 'API Secret:', !!apiSecret);
    throw new Error('Amadeus API credentials not configured');
  }

  const tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';
  
  console.log('Requesting token from:', tokenUrl);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=client_credentials&client_id=${apiKey}&client_secret=${apiSecret}`,
  });

  console.log('Token response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token request failed:', response.status, errorText);
    throw new Error(`Failed to get Amadeus token: ${response.status} - ${errorText}`);
  }

  const tokenData: AmadeusTokenResponse = await response.json();
  console.log('Token obtained successfully, expires in:', tokenData.expires_in);
  return tokenData.access_token;
}

// Get points of interest (restaurants, attractions) near a location
async function getPointsOfInterest(token: string, params: PointOfInterestRequest) {
  const { latitude, longitude, radius = 5, categories = ['RESTAURANT'] } = params;
  
  console.log('Getting POI with params:', { latitude, longitude, radius, categories });
  
  const url = new URL('https://test.api.amadeus.com/v1/reference-data/locations/pois');
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('radius', radius.toString());
  url.searchParams.set('categories', categories.join(','));
  
  console.log('POI API URL:', url.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('POI response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('POI request failed:', response.status, errorText);
    throw new Error(`Failed to get points of interest: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('POI data received, count:', data?.data?.length || 0);
  return data;
}

// Search flights using Amadeus API
async function searchFlights(token: string, params: FlightSearchRequest) {
  console.log('✈️ Searching flights with params:', params);
  
  // For demo purposes, return mock flight data
  // In production, you would call the actual Amadeus Flight Offers Search API
  const mockFlights = [
    {
      id: '1',
      flightNumber: `${params.airline || 'AA'}123`,
      airline: params.airline || 'American Airlines',
      departure: {
        airport: params.origin,
        time: '08:00',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: '14:30',
        date: params.departureDate
      },
      duration: '6h 30m',
      price: '$299'
    },
    {
      id: '2',
      flightNumber: `${params.airline || 'UA'}456`,
      airline: params.airline || 'United Airlines',
      departure: {
        airport: params.origin,
        time: '12:15',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: '18:45',
        date: params.departureDate
      },
      duration: '6h 30m',
      price: '$325'
    },
    {
      id: '3',
      flightNumber: `${params.airline || 'DL'}789`,
      airline: params.airline || 'Delta Airlines',
      departure: {
        airport: params.origin,
        time: '16:20',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: '22:50',
        date: params.departureDate
      },
      duration: '6h 30m',
      price: '$280'
    }
  ];

  // Filter by flight number if provided
  const filteredFlights = params.flightNumber 
    ? mockFlights.filter(flight => 
        flight.flightNumber.toLowerCase().includes(params.flightNumber!.toLowerCase())
      )
    : mockFlights;

  console.log('✅ Flight search successful:', filteredFlights.length, 'flights found');
  return { data: filteredFlights };
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
    console.log('Amadeus API function called, method:', req.method);
    console.log('Request URL:', req.url);
    
    // Parse request body to get endpoint type
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request body parsed:', JSON.stringify(requestBody, null, 2));
    } catch (e) {
      console.error('Failed to parse JSON:', e);
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
      case 'search-flights': {
        const { origin, destination, departureDate, flightNumber, airline } = requestBody;
        
        if (!origin || !destination || !departureDate) {
          return new Response(
            JSON.stringify({ error: 'Origin, destination, and departure date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await searchFlights(token, { origin, destination, departureDate, flightNumber, airline });
        
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
              'search-flights - Search for flights between airports',
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
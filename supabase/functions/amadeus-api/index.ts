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
  flightType?: 'nonstop' | 'onestop' | 'any';
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
  
  // Generate realistic flight data with proper airline codes and flight numbers
  const airlineData = [
    { name: 'American Airlines', code: 'AA', flightRange: [1, 9999] },
    { name: 'United Airlines', code: 'UA', flightRange: [1, 9999] },
    { name: 'Delta Air Lines', code: 'DL', flightRange: [1, 9999] },
    { name: 'Air France', code: 'AF', flightRange: [1, 9999] },
    { name: 'British Airways', code: 'BA', flightRange: [1, 999] },
    { name: 'Lufthansa', code: 'LH', flightRange: [400, 2999] },
    { name: 'Emirates', code: 'EK', flightRange: [200, 699] },
    { name: 'Qatar Airways', code: 'QR', flightRange: [700, 999] }
  ];

  // Filter airlines if specified
  const filteredAirlines = params.airline 
    ? airlineData.filter(airline => 
        airline.name.toLowerCase().includes(params.airline!.toLowerCase()) ||
        airline.code.toLowerCase().includes(params.airline!.toLowerCase())
      )
    : airlineData;

  const mockFlights = [];
  const flightCount = Math.floor(Math.random() * 5) + 8; // 8-12 flights
  
  for (let i = 0; i < flightCount; i++) {
    const airline = filteredAirlines[i % filteredAirlines.length];
    
    // Generate realistic flight numbers within airline's range
    const flightNum = Math.floor(Math.random() * (airline.flightRange[1] - airline.flightRange[0]) + airline.flightRange[0]);
    const flightNumber = `${airline.code}${flightNum}`;
    
    // Determine if this is nonstop or one stop based on flightType preference
    let isNonstop = true;
    let stopLocation = '';
    
    if (params.flightType === 'onestop') {
      isNonstop = false;
    } else if (params.flightType === 'any') {
      isNonstop = Math.random() > 0.3; // 70% nonstop, 30% one stop
    }
    
    // Add realistic stop locations for one-stop flights
    const commonStops = ['ATL', 'ORD', 'DFW', 'DEN', 'LAX', 'PHX', 'CLT', 'MIA', 'SEA', 'LAS'];
    if (!isNonstop) {
      stopLocation = commonStops[Math.floor(Math.random() * commonStops.length)];
    }
    
    // Generate realistic departure times
    const departureHour = Math.floor(Math.random() * 24);
    const departureMinute = Math.floor(Math.random() * 4) * 15;
    const departureTime = `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`;
    
    // Calculate realistic flight duration
    let baseDuration = 6; // Base duration in hours
    if (!isNonstop) {
      baseDuration += 2 + Math.floor(Math.random() * 4); // Add 2-5 hours for layover
    }
    baseDuration += Math.floor(Math.random() * 4); // Add 0-3 hours variation
    
    const minutes = Math.floor(Math.random() * 4) * 15;
    const durationString = `${baseDuration}h ${minutes > 0 ? minutes + 'm' : ''}`.trim();
    
    // Calculate arrival time
    const departureDate = new Date(`${params.departureDate}T${departureTime}:00`);
    const arrivalDate = new Date(departureDate.getTime() + (baseDuration * 60 + minutes) * 60000);
    const arrivalTime = `${arrivalDate.getHours().toString().padStart(2, '0')}:${arrivalDate.getMinutes().toString().padStart(2, '0')}`;
    
    // Generate realistic prices (higher for nonstop, lower for one-stop)
    const basePrice = isNonstop ? 300 + Math.floor(Math.random() * 500) : 200 + Math.floor(Math.random() * 400);
    const price = `$${basePrice}`;

    mockFlights.push({
      id: `flight-${i + 1}`,
      flightNumber: flightNumber,
      airline: airline.name,
      departure: {
        airport: params.origin,
        time: departureTime,
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: arrivalTime,
        date: arrivalDate.toISOString().split('T')[0]
      },
      duration: durationString,
      price: price,
      stops: isNonstop ? 0 : 1,
      stopLocations: isNonstop ? [] : [stopLocation]
    });
  }

  // Filter by flight number if provided
  const filteredFlights = params.flightNumber 
    ? mockFlights.filter(flight => 
        flight.flightNumber.toLowerCase().includes(params.flightNumber!.toLowerCase())
      )
    : mockFlights;

  console.log('✅ Flight search successful:', filteredFlights.length, 'flights found');
  return { data: filteredFlights };
}

// Search for cities and airports (for location autocomplete)
async function searchCities(token: string, keyword: string) {
  console.log('🏙️ Searching cities/airports with keyword:', keyword);
  
  // For demo purposes, return mock city/airport data
  // In production, you would call the actual Amadeus Location API
  const mockCities = [
    {
      id: 'CNYC',
      name: 'New York',
      iataCode: 'NYC',
      geoCode: { latitude: 40.7128, longitude: -74.0060 },
      address: { countryCode: 'US', countryName: 'United States', stateCode: 'NY' }
    },
    {
      id: 'AJFK',
      name: 'John F Kennedy International Airport',
      iataCode: 'JFK',
      geoCode: { latitude: 40.6413, longitude: -73.7781 },
      address: { countryCode: 'US', countryName: 'United States', stateCode: 'NY' }
    },
    {
      id: 'ALGA',
      name: 'LaGuardia Airport',
      iataCode: 'LGA',
      geoCode: { latitude: 40.7769, longitude: -73.8740 },
      address: { countryCode: 'US', countryName: 'United States', stateCode: 'NY' }
    },
    {
      id: 'CLOND',
      name: 'London',
      iataCode: 'LON',
      geoCode: { latitude: 51.5074, longitude: -0.1278 },
      address: { countryCode: 'GB', countryName: 'United Kingdom' }
    },
    {
      id: 'ALHR',
      name: 'London Heathrow Airport',
      iataCode: 'LHR',
      geoCode: { latitude: 51.4700, longitude: -0.4543 },
      address: { countryCode: 'GB', countryName: 'United Kingdom' }
    },
    {
      id: 'CPARIS',
      name: 'Paris',
      iataCode: 'PAR',
      geoCode: { latitude: 48.8566, longitude: 2.3522 },
      address: { countryCode: 'FR', countryName: 'France' }
    },
    {
      id: 'ACDG',
      name: 'Charles de Gaulle Airport',
      iataCode: 'CDG',
      geoCode: { latitude: 49.0097, longitude: 2.5479 },
      address: { countryCode: 'FR', countryName: 'France' }
    },
    {
      id: 'CTOKYO',
      name: 'Tokyo',
      iataCode: 'TYO',
      geoCode: { latitude: 35.6762, longitude: 139.6503 },
      address: { countryCode: 'JP', countryName: 'Japan' }
    },
    {
      id: 'ANRT',
      name: 'Narita International Airport',
      iataCode: 'NRT',
      geoCode: { latitude: 35.7720, longitude: 140.3929 },
      address: { countryCode: 'JP', countryName: 'Japan' }
    }
  ];

  // Filter based on keyword (case insensitive)
  const filteredCities = mockCities.filter(city => 
    city.name.toLowerCase().includes(keyword.toLowerCase()) ||
    city.iataCode.toLowerCase().includes(keyword.toLowerCase())
  );

  console.log('✅ City search successful:', filteredCities.length, 'results found');
  return { data: filteredCities };
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
        const { origin, destination, departureDate, flightNumber, airline, flightType } = requestBody;
        
        if (!origin || !destination || !departureDate) {
          return new Response(
            JSON.stringify({ error: 'Origin, destination, and departure date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await searchFlights(token, { origin, destination, departureDate, flightNumber, airline, flightType });
        
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
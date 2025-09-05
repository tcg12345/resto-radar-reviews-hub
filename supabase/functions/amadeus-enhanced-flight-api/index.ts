import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AmadeusTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: {
        iataCode: string;
        at: string;
        terminal?: string;
      };
      arrival: {
        iataCode: string;
        at: string;
        terminal?: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      numberOfStops: number;
      duration: string;
      operating?: {
        carrierCode: string;
      };
    }>;
  }>;
  price: {
    currency: string;
    total: string;
    base: string;
    fees?: Array<{
      amount: string;
      type: string;
    }>;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: {
      currency: string;
      total: string;
      base: string;
    };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      brandedFare?: string;
      class: string;
      includedCheckedBags: {
        quantity: number;
      };
    }>;
  }>;
}

interface AmadeusFlightResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers: Record<string, string>;
    aircraft: Record<string, string>;
    locations: Record<string, any>;
    currencies: Record<string, string>;
  };
  meta?: {
    count: number;
    links?: {
      self: string;
    };
  };
}

interface AmadeusLocation {
  id: string;
  name: string;
  address: {
    cityName: string;
    countryName: string;
    countryCode: string;
  };
  geoCode: {
    latitude: number;
    longitude: number;
  };
  iataCode?: string;
  type: string;
  timeZone?: string;
}

interface AmadeusAirlineInfo {
  type: string;
  iataCode: string;
  icaoCode: string;
  businessName: string;
  commonName: string;
}

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  maxPrice?: number;
  currency?: string;
  max?: number;
}

interface FlightPriceRequest {
  origin: string;
  destination: string;
  departureDate: string;
  oneWay?: boolean;
}

interface AirportInfoRequest {
  airportCode: string;
}

interface FlightStatusRequest {
  carrierCode: string;
  flightNumber: string;
  scheduledDepartureDate: string;
}

// Get Amadeus API credentials
function getAmadeusCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = Deno.env.get('AMADEUS_API_KEY');
  const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
  
  console.log('🔑 Amadeus API Key exists:', !!apiKey);
  console.log('🔑 Amadeus API Secret exists:', !!apiSecret);
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Missing Amadeus API credentials');
    throw new Error('Amadeus API credentials not configured');
  }

  return { apiKey, apiSecret };
}

// Get Amadeus access token
async function getAmadeusToken(): Promise<string> {
  const { apiKey, apiSecret } = getAmadeusCredentials();
  
  const tokenUrl = 'https://api.amadeus.com/v1/security/oauth2/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: apiSecret,
    }),
  });

  if (!response.ok) {
    console.error('❌ Failed to get Amadeus token:', response.status, await response.text());
    throw new Error(`Failed to authenticate with Amadeus API: ${response.status}`);
  }

  const tokenData: AmadeusTokenResponse = await response.json();
  console.log('✅ Amadeus token obtained successfully');
  return tokenData.access_token;
}

// Search flights with enhanced features
async function searchFlights(params: FlightSearchRequest) {
  console.log('✈️ Starting enhanced flight search');
  console.log('📊 Search params:', JSON.stringify(params, null, 2));
  
  try {
    const token = await getAmadeusToken();
    
    // Build request parameters
    const searchParams = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: (params.adults || 1).toString(),
      currencyCode: params.currency || 'USD',
      max: (params.max || 100).toString() // Increased default from 20 to 100 for comprehensive results
    });

    if (params.returnDate) {
      searchParams.append('returnDate', params.returnDate);
    }

    if (params.children) {
      searchParams.append('children', params.children.toString());
    }

    if (params.infants) {
      searchParams.append('infants', params.infants.toString());
    }

    if (params.travelClass) {
      searchParams.append('travelClass', params.travelClass);
    }

    if (params.nonStop) {
      searchParams.append('nonStop', 'true');
    }

    if (params.maxPrice) {
      searchParams.append('maxPrice', params.maxPrice.toString());
    }

    const url = `https://api.amadeus.com/v2/shopping/flight-offers?${searchParams.toString()}`;
    console.log('🌐 Amadeus API request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Amadeus API request failed:', response.status, errorText);
      
      if (response.status === 404) {
        return { data: [], meta: { count: 0 } };
      }
      
      throw new Error(`Amadeus API error: ${response.status} - ${errorText}`);
    }

    const data: AmadeusFlightResponse = await response.json();
    console.log('✅ Flight search successful:', data.data?.length || 0, 'offers found');
    
    return data;
  } catch (error) {
    console.error('❌ Flight search error:', error);
    throw error;
  }
}

// Get flight price calendar
async function getFlightPriceCalendar(params: FlightPriceRequest) {
  console.log('📅 Getting flight price calendar');
  
  try {
    const token = await getAmadeusToken();
    
    const searchParams = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      oneWay: (params.oneWay || true).toString()
    });

    const url = `https://api.amadeus.com/v1/shopping/flight-dates?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('❌ Price calendar not available');
      return { data: [] };
    }

    const data = await response.json();
    console.log('✅ Price calendar retrieved successfully');
    return data;
  } catch (error) {
    console.error('❌ Price calendar error:', error);
    return { data: [] };
  }
}

// Get airport information
async function getAirportInfo(params: AirportInfoRequest) {
  console.log('🛫 Getting airport information for:', params.airportCode);
  
  try {
    const token = await getAmadeusToken();
    
    const url = `https://api.amadeus.com/v1/reference-data/locations/airports?keyword=${params.airportCode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('❌ Airport info not available');
      return { data: [] };
    }

    const data = await response.json();
    console.log('✅ Airport info retrieved successfully');
    return data;
  } catch (error) {
    console.error('❌ Airport info error:', error);
    return { data: [] };
  }
}

// Get airline information
async function getAirlineInfo(airlineCode: string) {
  console.log('✈️ Getting airline information for:', airlineCode);
  
  try {
    const token = await getAmadeusToken();
    
    const url = `https://api.amadeus.com/v1/reference-data/airlines?airlineCodes=${airlineCode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('❌ Airline info not available');
      return { data: [] };
    }

    const data = await response.json();
    console.log('✅ Airline info retrieved successfully');
    return data;
  } catch (error) {
    console.error('❌ Airline info error:', error);
    return { data: [] };
  }
}

// Get flight status
async function getFlightStatus(params: FlightStatusRequest) {
  console.log('📡 Getting flight status');
  
  try {
    const token = await getAmadeusToken();
    
    const searchParams = new URLSearchParams({
      carrierCode: params.carrierCode,
      flightNumber: params.flightNumber,
      scheduledDepartureDate: params.scheduledDepartureDate
    });

    const url = `https://api.amadeus.com/v2/schedule/flights?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.log('❌ Flight status not available');
      return { data: [] };
    }

    const data = await response.json();
    console.log('✅ Flight status retrieved successfully');
    return data;
  } catch (error) {
    console.error('❌ Flight status error:', error);
    return { data: [] };
  }
}

// Search locations (airports and cities)
async function searchLocations(keyword: string) {
  console.log('🏙️ Searching locations for:', keyword);
  
  try {
    const token = await getAmadeusToken();
    
    const searchParams = new URLSearchParams({
      keyword: keyword,
      max: '20',
      'page[limit]': '20'
    });

    const url = `https://api.amadeus.com/v1/reference-data/locations?${searchParams.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('❌ Location search failed, using fallback');
      return getFallbackLocations(keyword);
    }

    const data = await response.json();
    console.log('✅ Location search successful');
    return data;
  } catch (error) {
    console.error('❌ Location search error:', error);
    return getFallbackLocations(keyword);
  }
}

// Fallback location search
function getFallbackLocations(keyword: string) {
  const staticLocations = [
    { id: 'JFK', name: 'John F. Kennedy International Airport', iataCode: 'JFK', address: { cityName: 'New York', countryName: 'United States' }},
    { id: 'LAX', name: 'Los Angeles International Airport', iataCode: 'LAX', address: { cityName: 'Los Angeles', countryName: 'United States' }},
    { id: 'LHR', name: 'London Heathrow Airport', iataCode: 'LHR', address: { cityName: 'London', countryName: 'United Kingdom' }},
    { id: 'CDG', name: 'Charles de Gaulle Airport', iataCode: 'CDG', address: { cityName: 'Paris', countryName: 'France' }},
    { id: 'NRT', name: 'Narita International Airport', iataCode: 'NRT', address: { cityName: 'Tokyo', countryName: 'Japan' }},
  ];
  
  const filtered = staticLocations.filter(loc => 
    loc.name.toLowerCase().includes(keyword.toLowerCase()) ||
    loc.iataCode.toLowerCase().includes(keyword.toLowerCase()) ||
    loc.address.cityName.toLowerCase().includes(keyword.toLowerCase())
  );
  
  return { data: filtered };
}

serve(async (req) => {
  console.log('🚀 Enhanced Amadeus API function called');
  console.log('📝 Method:', req.method);
  console.log('📝 URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));
    } catch (e) {
      console.error('❌ Failed to parse JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { endpoint } = requestBody;
    console.log('🎯 Endpoint requested:', endpoint);

    switch (endpoint) {
      case 'searchFlights':
      case 'search-flights': {
        const searchParams: FlightSearchRequest = {
          origin: requestBody.originLocationCode,
          destination: requestBody.destinationLocationCode,
          departureDate: requestBody.departureDate,
          returnDate: requestBody.returnDate,
          adults: requestBody.adults || 1,
          children: requestBody.children || 0,
          infants: requestBody.infants || 0,
          travelClass: requestBody.travelClass,
          nonStop: requestBody.nonStop,
          maxPrice: requestBody.maxPrice,
          currency: requestBody.currencyCode || 'USD',
          max: requestBody.max || 20
        };
        
        console.log('🔍 Parsed search params:', searchParams);
        const data = await searchFlights(searchParams);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'flight-price-calendar': {
        const priceParams: FlightPriceRequest = requestBody;
        const data = await getFlightPriceCalendar(priceParams);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'airport-info': {
        const airportParams: AirportInfoRequest = requestBody;
        const data = await getAirportInfo(airportParams);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'airline-info': {
        const { airlineCode } = requestBody;
        const data = await getAirlineInfo(airlineCode);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'flight-status': {
        const statusParams: FlightStatusRequest = requestBody;
        const data = await getFlightStatus(statusParams);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'searchLocations':
      case 'search-locations': {
        const { keyword } = requestBody;
        const data = await searchLocations(keyword);
        
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default: {
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
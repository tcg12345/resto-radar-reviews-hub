import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FlightAPIResponse {
  itineraries?: Array<{
    id: string;
    leg_ids: string[];
    pricing_options: Array<{
      price: {
        amount: number;
        update_status: string;
      };
      items: Array<{
        url: string;
      }>;
    }>;
  }>;
  legs?: Array<{
    id: string;
    origin_place_id: number;
    destination_place_id: number;
    departure: string;
    arrival: string;
    duration: number;
    stop_count: number;
    marketing_carrier_ids: number[];
  }>;
  segments?: Array<{
    id: string;
    marketing_flight_number: string;
    marketing_carrier_id: number;
  }>;
  places?: Array<{
    id: number;
    iata_code: string;
    name: string;
  }>;
  carriers?: Array<{
    id: number;
    name: string;
    iata_code: string;
  }>;
}

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  flightNumber?: string;
  airline?: string;
  flightType?: 'nonstop' | 'onestop' | 'any';
}

// Get FlightAPI.io API access
function getFlightAPIKey(): string {
  const apiKey = Deno.env.get('FLIGHTAPI_IO_API_KEY');
  
  console.log('🔑 FlightAPI.io API Key exists:', !!apiKey);
  console.log('🔑 API Key length:', apiKey ? apiKey.length : 0);
  
  if (!apiKey) {
    console.error('❌ Missing FlightAPI.io API key');
    throw new Error('FlightAPI.io API key not configured');
  }

  return apiKey;
}

// Simple airport search fallback (FlightAPI.io doesn't have airport search)
async function searchAirportsAndCities(keyword: string) {
  console.log('🏙️ Searching airports/cities with keyword:', keyword);
  
  // Basic airport list for common searches
  const commonAirports = [
    { iata_code: 'JFK', airport_name: 'John F. Kennedy International Airport', country_name: 'United States', latitude: 40.6413, longitude: -73.7781 },
    { iata_code: 'LAX', airport_name: 'Los Angeles International Airport', country_name: 'United States', latitude: 33.9425, longitude: -118.4081 },
    { iata_code: 'LHR', airport_name: 'London Heathrow Airport', country_name: 'United Kingdom', latitude: 51.4700, longitude: -0.4543 },
    { iata_code: 'CDG', airport_name: 'Charles de Gaulle Airport', country_name: 'France', latitude: 49.0097, longitude: 2.5479 },
    { iata_code: 'NRT', airport_name: 'Narita International Airport', country_name: 'Japan', latitude: 35.7647, longitude: 140.3864 },
    { iata_code: 'SYD', airport_name: 'Sydney Kingsford Smith Airport', country_name: 'Australia', latitude: -33.9399, longitude: 151.1753 },
    { iata_code: 'DXB', airport_name: 'Dubai International Airport', country_name: 'United Arab Emirates', latitude: 25.2532, longitude: 55.3657 },
    { iata_code: 'SIN', airport_name: 'Singapore Changi Airport', country_name: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
    { iata_code: 'FRA', airport_name: 'Frankfurt Airport', country_name: 'Germany', latitude: 50.0379, longitude: 8.5622 },
    { iata_code: 'ORD', airport_name: 'Chicago O\'Hare International Airport', country_name: 'United States', latitude: 41.9742, longitude: -87.9073 }
  ];
  
  // Filter airports by keyword
  const filtered = commonAirports.filter(airport => 
    airport.iata_code.toLowerCase().includes(keyword.toLowerCase()) ||
    airport.airport_name.toLowerCase().includes(keyword.toLowerCase()) ||
    airport.country_name.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Transform to expected format
  const transformedData = filtered.map((airport) => ({
    id: airport.iata_code,
    name: airport.airport_name,
    iataCode: airport.iata_code,
    geoCode: {
      latitude: airport.latitude,
      longitude: airport.longitude
    },
    address: {
      countryCode: airport.country_name === 'United States' ? 'US' : 'XX',
      countryName: airport.country_name,
      stateCode: ''
    }
  }));
  
  console.log('Airport search results:', transformedData.length);
  return transformedData;
}

// Search flights using FlightAPI.io
async function searchFlights(apiKey: string, params: FlightSearchRequest) {
  console.log('✈️ Starting flight search with FlightAPI.io');
  console.log('📊 Search params:', JSON.stringify(params, null, 2));
  
  // Validate parameters
  if (!params.origin || !params.destination || !params.departureDate) {
    console.error('❌ Missing required parameters:', { 
      origin: !!params.origin, 
      destination: !!params.destination, 
      departureDate: !!params.departureDate 
    });
    throw new Error('Missing required search parameters');
  }
  
  // FlightAPI.io URL structure: 
  // /onewaytrip/{api-key}/{departure_code}/{arrival_code}/{departure_date}/{adults}/{children}/{infants}/{cabin_class}/{currency}
  const url = `https://api.flightapi.io/onewaytrip/${apiKey}/${params.origin}/${params.destination}/${params.departureDate}/1/0/0/Economy/USD`;
  
  console.log('🌐 FlightAPI.io request URL:', url.replace(apiKey, '[API_KEY]'));
  
  try {
    console.log('📡 Making API request to FlightAPI.io...');
    const response = await fetch(url);
    console.log('📨 Response received - Status:', response.status);
    console.log('📨 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FlightAPI.io request failed');
      console.error('❌ Status:', response.status);
      console.error('❌ Error response body:', errorText);
      
      if (response.status === 404 || response.status === 410) {
        console.log('ℹ️ No flights found for this route/date - returning empty results');
        return { data: [] };
      }
      
      if (response.status === 429) {
        console.error('❌ FlightAPI.io: Rate limit exceeded');
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      if (response.status === 401) {
        console.error('❌ FlightAPI.io: Unauthorized - check API key');
        throw new Error('Invalid API key - please check your FlightAPI.io credentials');
      }
      
      throw new Error(`FlightAPI.io API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Response OK, parsing JSON...');
    const data: FlightAPIResponse = await response.json();
    console.log('📊 FlightAPI.io data received successfully');
    console.log('📊 Response data structure:', {
      itineraries: data.itineraries?.length || 0,
      legs: data.legs?.length || 0,
      carriers: data.carriers?.length || 0,
      places: data.places?.length || 0,
      segments: data.segments?.length || 0
    });
    
    if (!data.itineraries || data.itineraries.length === 0) {
      console.log('ℹ️ No flight itineraries found in response');
      return { data: [] };
    }

    // Create lookup maps for efficient data access
    const placesMap = new Map(data.places?.map(p => [p.id, p]) || []);
    const carriersMap = new Map(data.carriers?.map(c => [c.id, c]) || []);
    const legsMap = new Map(data.legs?.map(l => [l.id, l]) || []);
    const segmentsMap = new Map(data.segments?.map(s => [s.id, s]) || []);
    
    // Transform FlightAPI.io data to our format
    const transformedFlights = data.itineraries
      .map((itinerary, index) => {
        if (!itinerary.leg_ids || itinerary.leg_ids.length === 0) return null;
        
        const legId = itinerary.leg_ids[0]; // First leg for one-way trip
        const leg = legsMap.get(legId);
        
        if (!leg) return null;
        
        const originPlace = placesMap.get(leg.origin_place_id);
        const destPlace = placesMap.get(leg.destination_place_id);
        const carrier = carriersMap.get(leg.marketing_carrier_ids[0]);
        
        // Get the correct segment for this specific leg
        // Find segments that match this leg's carrier and are likely part of this routing
        const legSegments = data.segments?.filter(s => 
          leg.marketing_carrier_ids.includes(s.marketing_carrier_id)
        ) || [];
        
        const primarySegment = legSegments[0]; // Use the first matching segment
        
        // Apply airline filter
        if (params.airline && carrier) {
          const airlineMatch = carrier.name?.toLowerCase().includes(params.airline.toLowerCase()) ||
                             carrier.iata_code?.toLowerCase() === params.airline.toLowerCase();
          if (!airlineMatch) return null;
        } else if (params.airline && !carrier) {
          // If airline filter is specified but no carrier info available, skip this flight
          return null;
        }
        
        // Apply flight type filter
        if (params.flightType === 'nonstop' && leg.stop_count > 0) return null;
        if (params.flightType === 'onestop' && leg.stop_count !== 1) return null;
        
        // Format times
        const depTime = new Date(leg.departure).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const arrTime = new Date(leg.arrival).toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // Format duration
        const durationHours = Math.floor(leg.duration / 60);
        const durationMinutes = leg.duration % 60;
        const durationString = `${durationHours}h ${durationMinutes}m`;
        
        // Get price from pricing options
        const price = itinerary.pricing_options[0]?.price?.amount || 0;
        const bookingUrl = itinerary.pricing_options[0]?.items[0]?.url || '';
        
        return {
          id: itinerary.id,
          flightNumber: primarySegment?.marketing_flight_number || `${carrier?.iata_code || 'XX'}000`,
          airline: carrier?.name || 'Unknown Airline',
          departure: {
            airport: originPlace?.iata_code || params.origin,
            time: depTime,
            date: params.departureDate
          },
          arrival: {
            airport: destPlace?.iata_code || params.destination,
            time: arrTime,
            date: new Date(leg.arrival).toISOString().split('T')[0]
          },
          duration: durationString,
          price: price > 0 ? `$${Math.round(price)}` : 'Price on request',
          stops: leg.stop_count,
          stopLocations: [], // FlightAPI.io doesn't provide stop details in this response
          bookingUrl: bookingUrl
        };
      })
      .filter(Boolean); // Remove null entries
    
    console.log('✅ FlightAPI.io search successful:', transformedFlights.length, 'flights found');
    return { data: transformedFlights };
  } catch (fetchError) {
    console.error('❌ Network/Fetch error:', fetchError.message);
    console.error('❌ Full error:', fetchError);
    throw new Error(`Network error: ${fetchError.message}`);
  }
}


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 FlightAPI.io function called, method:', req.method);
    
    // Parse request body to get endpoint type
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
    
    // Get FlightAPI.io API key with detailed logging
    let apiKey;
    try {
      apiKey = getFlightAPIKey();
      console.log('✅ FlightAPI.io API key obtained successfully');
    } catch (keyError) {
      console.error('❌ API key error:', keyError.message);
      return new Response(
        JSON.stringify({ error: 'API key configuration error', details: keyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (endpoint) {
      case 'search-flights': {
        const { origin, destination, departureDate, flightNumber, airline, flightType } = requestBody;
        
        if (!origin || !destination || !departureDate) {
          console.error('❌ Missing required flight search parameters');
          return new Response(
            JSON.stringify({ error: 'Origin, destination, and departure date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          console.log('🔍 Starting flight search...');
          const data = await searchFlights(apiKey, { origin, destination, departureDate, flightNumber, airline, flightType });
          console.log('✅ Flight search completed successfully');
          
          return new Response(
            JSON.stringify(data),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (searchError) {
          console.error('❌ Flight search failed:', searchError.message);
          console.error('❌ Search error details:', searchError);
          
          return new Response(
            JSON.stringify({ 
              error: 'Flight search failed', 
              details: searchError.message,
              params: { origin, destination, departureDate, flightNumber, airline, flightType }
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      case 'search-cities': {
        const { keyword } = requestBody;
        
        if (!keyword) {
          return new Response(
            JSON.stringify({ error: 'Keyword is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await searchAirportsAndCities(keyword);
        
        return new Response(
          JSON.stringify({ data }),
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
              'search-flights - Search for real flights using FlightAPI.io',
              'search-cities - Search for airports and cities'
            ]
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in FlightAPI.io function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
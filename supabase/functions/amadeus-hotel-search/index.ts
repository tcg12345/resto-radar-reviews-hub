import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Production Amadeus API base URL
const AMADEUS_API_BASE = "https://api.amadeus.com";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AmadeusTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Get production Amadeus API credentials
function getAmadeusCredentials(): { apiKey: string; apiSecret: string } {
  console.log('🔑 Getting production Amadeus credentials...');
  
  const apiKey = Deno.env.get('AMADEUS_API_KEY');
  const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
  
  console.log('🔧 Environment check:');
  console.log('  - API Key exists:', !!apiKey);
  console.log('  - API Secret exists:', !!apiSecret);
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Production Amadeus credentials missing!');
    throw new Error('Production Amadeus API credentials not configured. Please set AMADEUS_API_KEY and AMADEUS_API_SECRET.');
  }

  console.log('✅ Production credentials found');
  return { apiKey, apiSecret };
}

// Get Amadeus access token from production
async function getAmadeusToken(): Promise<string> {
  console.log('🔧 Getting production Amadeus token...');
  
  const { apiKey, apiSecret } = getAmadeusCredentials();
  
  const response = await fetch(`${AMADEUS_API_BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: apiSecret,
    }),
  });

  console.log('🔧 Token response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token request failed:', response.status, errorText);
    throw new Error(`Failed to get production Amadeus token: ${response.status} - ${errorText}`);
  }

  const tokenData: AmadeusTokenResponse = await response.json();
  console.log('✅ Production token obtained successfully');
  
  return tokenData.access_token;
}

// Search hotels using production Amadeus Hotel List + Hotel Offers API
async function searchAmadeusHotels(location: string, checkInDate: string, checkOutDate: string, guests: number) {
  console.log('🏨 === STARTING PRODUCTION HOTEL SEARCH ===');
  console.log('📍 Search parameters:', { location, checkInDate, checkOutDate, guests });
  
  try {
    // Step 1: Get production token
    console.log('🔑 Step 1: Getting production token...');
    const token = await getAmadeusToken();
    console.log('✅ Token obtained successfully');
    
    // Step 2: Search for location to get city code or coordinates
    console.log('🔍 Step 2: Searching for location:', location);
    const locationUrl = `${AMADEUS_API_BASE}/v1/reference-data/locations?keyword=${encodeURIComponent(location)}&subType=CITY`;
    console.log('🔗 Location URL:', locationUrl);
    
    const locationResponse = await fetch(locationUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📍 Location response status:', locationResponse.status);
    
    if (!locationResponse.ok) {
      const errorText = await locationResponse.text();
      console.error('❌ Location search failed:', locationResponse.status, errorText);
      throw new Error(`Location search failed: ${locationResponse.status} - ${errorText}`);
    }
    
    const locationData = await locationResponse.json();
    console.log('📍 Location search results:', locationData.data?.length || 0, 'locations found');
    
    if (!locationData.data || locationData.data.length === 0) {
      console.error('❌ No location data found for:', location);
      throw new Error(`No location found for: ${location}`);
    }
    
    const bestLocation = locationData.data[0];
    console.log('✅ Using location:', bestLocation.name, bestLocation.address?.cityCode || 'No city code');
    
    // Step 3: Get hotel list using Hotel List API
    console.log('🏨 Step 3: Getting hotel list for location...');
    
    let hotelListUrl;
    if (bestLocation.geoCode?.latitude && bestLocation.geoCode?.longitude) {
      hotelListUrl = `${AMADEUS_API_BASE}/v1/reference-data/locations/hotels/by-geocode?latitude=${bestLocation.geoCode.latitude}&longitude=${bestLocation.geoCode.longitude}&radius=20&radiusUnit=KM`;
      console.log('📍 Using geographic hotel search (lat/lng)');
    } else if (bestLocation.address?.cityCode || bestLocation.iataCode) {
      const destinationCode = bestLocation.address?.cityCode || bestLocation.iataCode;
      hotelListUrl = `${AMADEUS_API_BASE}/v1/reference-data/locations/hotels/by-city?cityCode=${destinationCode}`;
      console.log('🏙️ Using city code hotel search:', destinationCode);
    } else {
      console.error('❌ No suitable search parameters found');
      console.error('❌ Location data:', JSON.stringify(bestLocation, null, 2));
      throw new Error('Unable to determine search parameters for hotel list');
    }
    
    console.log('🔗 Hotel list URL:', hotelListUrl);
    
    const hotelListResponse = await fetch(hotelListUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🏨 Hotel list response status:', hotelListResponse.status);
    
    if (!hotelListResponse.ok) {
      const errorText = await hotelListResponse.text();
      console.error('❌ Hotel list search failed:', hotelListResponse.status, errorText);
      throw new Error(`Hotel list search failed: ${hotelListResponse.status} - ${errorText}`);
    }
    
    const hotelListData = await hotelListResponse.json();
    console.log('🏨 Hotels in list:', hotelListData.data?.length || 0);
    
    if (!hotelListData.data || hotelListData.data.length === 0) {
      console.log('⚠️ No hotels found in list for this location');
      throw new Error(`No hotels found for ${location}`);
    }
    
    // Step 4: Get hotel offers for the first few hotels (limit to avoid timeout)
    const hotelIds = hotelListData.data.slice(0, 20).map((hotel: any) => hotel.hotelId).join(',');
    console.log('🔍 Step 4: Getting offers for hotel IDs:', hotelIds.substring(0, 50) + '...');
    
    const hotelOffersUrl = `${AMADEUS_API_BASE}/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${guests}&currency=USD`;
    console.log('🔗 Hotel offers URL (truncated):', hotelOffersUrl.substring(0, 100) + '...');
    
    const hotelOffersResponse = await fetch(hotelOffersUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🏨 Hotel offers response status:', hotelOffersResponse.status);
    
    if (!hotelOffersResponse.ok) {
      const errorText = await hotelOffersResponse.text();
      console.error('❌ Hotel offers search failed:', hotelOffersResponse.status, errorText);
      throw new Error(`Hotel offers search failed: ${hotelOffersResponse.status} - ${errorText}`);
    }
    
    const hotelOffersData = await hotelOffersResponse.json();
    console.log('🏨 Hotel offers found:', hotelOffersData.data?.length || 0);
    
    if (!hotelOffersData.data || hotelOffersData.data.length === 0) {
      console.log('⚠️ No hotel offers found, but API call succeeded');
      throw new Error(`No hotel offers available for ${location} on the specified dates`);
    }
  
    // Step 5: Transform production hotel data with offers
    const realHotels = hotelOffersData.data.map((hotelOffer: any, index: number) => {
      const hotel = hotelOffer.hotel;
      const offers = hotelOffer.offers || [];
      const bestOffer = offers[0];
      
      console.log(`🏨 Processing hotel ${index + 1}: ${hotel.name}`);
      
      let priceRange = 'Contact for rates';
      if (bestOffer?.price?.total) {
        const currency = bestOffer.price.currency || 'USD';
        const total = parseFloat(bestOffer.price.total);
        priceRange = `${currency} ${Math.round(total)} per night`;
      }
      
      let address = hotel.address?.lines?.[0] || location;
      if (hotel.address) {
        const addressParts = [
          hotel.address.lines?.[0],
          hotel.address.cityName,
          hotel.address.countryCode
        ].filter(Boolean);
        address = addressParts.join(', ') || location;
      }
      
      // Extract amenities from hotel data
      const amenities = [];
      if (hotel.amenities) {
        amenities.push(...hotel.amenities.map((a: any) => a.description || a).slice(0, 6));
      }
      if (amenities.length === 0) {
        amenities.push('Contact hotel for amenities');
      }
      
      return {
        id: hotel.hotelId || `amadeus-${Date.now()}-${index}`,
        name: hotel.name || `Hotel in ${location}`,
        address: address,
        description: bestOffer?.room?.description || `${hotel.name} offers comfortable accommodations in ${location}.`,
        rating: hotel.rating || 4.0,
        priceRange: priceRange,
        amenities: amenities,
        photos: [`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80&auto=format&fit=crop`],
        latitude: hotel.latitude || bestLocation.geoCode?.latitude,
        longitude: hotel.longitude || bestLocation.geoCode?.longitude,
        website: 'https://www.amadeus.com',
        phone: hotel.contact?.phone || 'Contact hotel directly',
        realData: true,
        source: 'AMADEUS_PRODUCTION_API',
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        adults: guests
      };
    });
    
    console.log('✅ Successfully processed', realHotels.length, 'REAL hotels from production Amadeus API');
    return realHotels;
    
  } catch (error) {
    console.error('💥 Production API Error:', error);
    throw error;
  }
}

serve(async (req) => {
  console.log('🚀 === AMADEUS HOTEL SEARCH - PRODUCTION API ===');
  console.log('📅 Request method:', req.method);
  console.log('🌐 API Base URL:', AMADEUS_API_BASE);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS request');
    return new Response('ok', { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    });
  }

  try {
    console.log('📝 Processing POST request...');
    const body = await req.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    const { location, checkInDate, checkOutDate, guests } = body;
    
    // Validate required parameters
    if (!location) {
      console.error('❌ Missing location parameter');
      return new Response(
        JSON.stringify({ 
          error: 'Location is required', 
          timestamp: new Date().toISOString() 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Set default values for optional parameters
    const searchParams = {
      location: location.trim(),
      checkInDate: checkInDate || '2025-01-15',
      checkOutDate: checkOutDate || '2025-01-16',
      guests: guests || 1
    };
    
    console.log('🔍 Final search params:', searchParams);
    
    // Perform the hotel search using production API
    const hotels = await searchAmadeusHotels(
      searchParams.location, 
      searchParams.checkInDate, 
      searchParams.checkOutDate, 
      searchParams.guests
    );
    
    const response = {
      data: hotels,
      searchParams: searchParams,
      timestamp: new Date().toISOString(),
      totalHotels: hotels.length,
      dataSource: 'AMADEUS_PRODUCTION_API',
      apiBase: AMADEUS_API_BASE
    };
    
    console.log('✅ Returning', hotels.length, 'real hotels from production API');
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 === PRODUCTION API ERROR ===');
    console.error('💥 Error type:', error.constructor.name);
    console.error('💥 Error message:', error.message);
    console.error('💥 Error stack:', error.stack);
    
    let errorMessage = 'Hotel search failed';
    let statusCode = 500;
    let errorType = 'PRODUCTION_API_ERROR';
    
    // Handle specific error types
    if (error.message.includes('credentials not configured') || error.message.includes('API credentials')) {
      errorMessage = 'Amadeus API credentials not configured';
      errorType = 'CREDENTIALS_ERROR';
      statusCode = 500;
    } else if (error.message.includes('Location search failed')) {
      errorMessage = 'Invalid location or location not found';
      errorType = 'LOCATION_ERROR';
      statusCode = 400;
    } else if (error.message.includes('Hotel search failed')) {
      errorMessage = 'Hotel search API failed';
      errorType = 'HOTEL_SEARCH_ERROR';
      statusCode = 500;
    } else if (error.message.includes('No hotels found')) {
      errorMessage = 'No hotels available for the specified criteria';
      errorType = 'NO_RESULTS';
      statusCode = 404;
    }
    
    // Return proper error response - no mock data fallback
    const errorResponse = {
      error: errorMessage,
      details: error.message,
      timestamp: new Date().toISOString(),
      type: errorType,
      apiBase: AMADEUS_API_BASE,
      suggestion: errorType === 'CREDENTIALS_ERROR' 
        ? 'Please check your Amadeus production credentials in Supabase secrets'
        : 'Please check your search parameters and try again'
    };
    
    console.error('💥 Returning error response:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
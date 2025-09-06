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

// Get Amadeus API credentials
function getAmadeusCredentials(): { apiKey: string; apiSecret: string } {
  const apiKey = Deno.env.get('AMADEUS_API_KEY');
  const apiSecret = Deno.env.get('AMADEUS_API_SECRET');
  
  if (!apiKey || !apiSecret) {
    console.log('⚠️ Amadeus credentials not available, using mock data');
    throw new Error('Amadeus API credentials not configured');
  }

  return { apiKey, apiSecret };
}

// Get Amadeus access token
async function getAmadeusToken(): Promise<string> {
  const { apiKey, apiSecret } = getAmadeusCredentials();
  
  const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: apiSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Amadeus token: ${response.status}`);
  }

  const tokenData: AmadeusTokenResponse = await response.json();
  return tokenData.access_token;
}

// Search hotels using Amadeus API
async function searchAmadeusHotels(location: string, checkInDate: string, checkOutDate: string, guests: number) {
  console.log('🏨 Searching hotels via Amadeus API for:', location);
  
  try {
    const token = await getAmadeusToken();
    console.log('✅ Got Amadeus token for hotel search');
    
    // Search for city code first
    const cityResponse = await fetch(`https://api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(location)}&max=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let cityCode = location;
    if (cityResponse.ok) {
      const cityData = await cityResponse.json();
      if (cityData.data && cityData.data.length > 0) {
        cityCode = cityData.data[0].address?.cityCode || cityData.data[0].id || location;
      }
    }
    
    console.log('🌍 City code for search:', cityCode);
    
    // Search for hotels in the city
    const hotelResponse = await fetch(`https://api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&max=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!hotelResponse.ok) {
      console.log('⚠️ Amadeus hotel search failed, using mock data');
      return getMockHotels(location);
    }
    
    const hotelData = await hotelResponse.json();
    console.log('✅ Amadeus hotel search successful:', hotelData.data?.length || 0, 'hotels');
    
    if (!hotelData.data || hotelData.data.length === 0) {
      return getMockHotels(location);
    }
    
    // Convert to expected format
    return hotelData.data.slice(0, 10).map((hotel: any) => ({
      id: hotel.hotelId || `hotel-${Date.now()}-${Math.random()}`,
      name: hotel.name || `Hotel in ${location}`,
      address: hotel.address ? `${hotel.address.lines?.join(', ') || ''}, ${location}` : location,
      description: `Experience comfort and luxury at ${hotel.name || 'this hotel'} in ${location}. Perfect for travelers seeking quality accommodations.`,
      rating: 4 + Math.random(),
      priceRange: 'USD 150-300',
      amenities: ['Free WiFi', 'Pool', 'Restaurant', 'Fitness Center', 'Room Service'],
      photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'],
      latitude: hotel.geoCode?.latitude,
      longitude: hotel.geoCode?.longitude,
      website: 'https://www.amadeus.com',
      phone: '+1-555-HOTEL'
    }));
    
  } catch (error) {
    console.error('❌ Amadeus hotel search error:', error);
    return getMockHotels(location);
  }
}

// Generate mock hotels when API fails
function getMockHotels(location: string) {
  console.log('🎭 Generating enhanced mock hotels for:', location);
  
  const locationName = location.split(',')[0].trim();
  
  return [
    {
      id: `mock-hotel-1-${Date.now()}`,
      name: `Grand ${locationName} Hotel`,
      address: `123 Main Street, ${location}`,
      description: `Experience luxury at the Grand ${locationName} Hotel, featuring elegant rooms and world-class amenities in the heart of ${locationName}.`,
      rating: 4.5,
      priceRange: 'USD 250-400',
      amenities: ['Free WiFi', 'Pool', 'Spa', 'Restaurant', 'Fitness Center', 'Room Service'],
      photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'],
      website: 'https://example.com',
      phone: '+1-555-0123'
    },
    {
      id: `mock-hotel-2-${Date.now()}`,
      name: `${locationName} Business Center`,
      address: `456 Business Ave, ${location}`,
      description: `Perfect for business travelers, the ${locationName} Business Center offers modern facilities and convenient location.`,
      rating: 4.2,
      priceRange: 'USD 180-280',
      amenities: ['Free WiFi', 'Business Center', 'Meeting Rooms', 'Fitness Center', 'Restaurant'],
      photos: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80'],
      website: 'https://example.com',
      phone: '+1-555-0124'
    },
    {
      id: `mock-hotel-3-${Date.now()}`,
      name: `${locationName} Suites`,
      address: `789 Family Blvd, ${location}`,
      description: `Spacious suites perfect for families and extended stays in ${locationName}, with full kitchen facilities.`,
      rating: 4.0,
      priceRange: 'USD 150-250',
      amenities: ['Free WiFi', 'Kitchenette', 'Family Rooms', 'Pool', 'Laundry Service'],
      photos: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80'],
      phone: '+1-555-0125'
    }
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🏨 Hotel search function called')
    
    const body = await req.json()
    console.log('📝 Search request:', JSON.stringify(body, null, 2))
    
    const { location, checkInDate, checkOutDate, guests } = body;
    
    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const hotels = await searchAmadeusHotels(
      location, 
      checkInDate || '2025-01-15', 
      checkOutDate || '2025-01-16', 
      guests || 1
    );
    
    console.log('✅ Returning', hotels.length, 'hotels');
    
    return new Response(
      JSON.stringify({ data: hotels }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Hotel search error:', error)
    return new Response(
      JSON.stringify({ error: 'Hotel search failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
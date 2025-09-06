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
    
    // Search for city/location first to get proper codes
    const locationResponse = await fetch(`https://api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(location)}&max=5&subType=CITY,AIRPORT`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let searchLocation = location;
    let geoCode = null;
    
    if (locationResponse.ok) {
      const locationData = await locationResponse.json();
      console.log('🌍 Location search results:', locationData.data?.length || 0);
      
      if (locationData.data && locationData.data.length > 0) {
        const bestMatch = locationData.data[0];
        searchLocation = bestMatch.address?.cityCode || bestMatch.iataCode || location;
        geoCode = bestMatch.geoCode;
        console.log('📍 Using location:', searchLocation, 'with geocode:', geoCode);
      }
    }
    
    // Search hotels using Hotel Shopping API (Shopping/Hotel offers)
    let hotelOffersUrl = `https://api.amadeus.com/v3/shopping/hotel-offers?destinationCode=${encodeURIComponent(searchLocation)}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${guests}&max=20`;
    
    // If we have geocode, use radius search for better results
    if (geoCode?.latitude && geoCode?.longitude) {
      hotelOffersUrl = `https://api.amadeus.com/v3/shopping/hotel-offers?latitude=${geoCode.latitude}&longitude=${geoCode.longitude}&radius=5&radiusUnit=KM&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${guests}&max=20`;
    }
    
    console.log('🔍 Hotel offers URL:', hotelOffersUrl);
    
    const hotelOffersResponse = await fetch(hotelOffersUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!hotelOffersResponse.ok) {
      console.log('⚠️ Hotel offers failed with status:', hotelOffersResponse.status);
      const errorText = await hotelOffersResponse.text();
      console.log('Error details:', errorText);
      
      // Fallback to hotel list by city if offers fail
      return await searchHotelsByCity(token, searchLocation, location);
    }
    
    const offersData = await hotelOffersResponse.json();
    console.log('✅ Hotel offers found:', offersData.data?.length || 0);
    
    if (!offersData.data || offersData.data.length === 0) {
      console.log('No offers found, trying hotel list fallback');
      return await searchHotelsByCity(token, searchLocation, location);
    }
    
    // Convert offers to our format
    return offersData.data.map((offer: any) => {
      const hotel = offer.hotel;
      const offers = offer.offers || [];
      const bestOffer = offers[0]; // Take the first/best offer
      
      return {
        id: hotel.hotelId || `hotel-${Date.now()}-${Math.random()}`,
        name: hotel.name || `Hotel in ${location}`,
        address: hotel.address ? formatAddress(hotel.address) : `${location}`,
        description: hotel.description || `Experience comfort at ${hotel.name || 'this hotel'} in ${location}.`,
        rating: hotel.rating || (4 + Math.random()),
        priceRange: bestOffer ? formatPriceRange(bestOffer) : 'Contact for pricing',
        amenities: hotel.amenities?.map((a: any) => a.description).slice(0, 6) || ['Free WiFi', 'Restaurant', 'Room Service'],
        photos: [getHotelPhoto(hotel.name)],
        latitude: hotel.latitude || geoCode?.latitude,
        longitude: hotel.longitude || geoCode?.longitude,
        website: hotel.contact?.phone ? `https://www.amadeus.com` : undefined,
        phone: hotel.contact?.phone || '+1-555-HOTEL',
        checkInDate,
        checkOutDate,
        guests,
        bookingDetails: bestOffer ? {
          currency: bestOffer.price?.currency,
          total: bestOffer.price?.total,
          roomType: bestOffer.room?.typeEstimated?.category,
          cancellation: bestOffer.policies?.cancellations?.[0]?.type
        } : null
      };
    });
    
  } catch (error) {
    console.error('❌ Amadeus hotel search error:', error);
    return getMockHotels(location);
  }
}

// Helper function to search hotels by city as fallback
async function searchHotelsByCity(token: string, cityCode: string, originalLocation: string) {
  try {
    const hotelListResponse = await fetch(`https://api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&max=15`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!hotelListResponse.ok) {
      console.log('⚠️ Hotel list also failed, using mock data');
      return getMockHotels(originalLocation);
    }
    
    const hotelListData = await hotelListResponse.json();
    console.log('✅ Hotel list found:', hotelListData.data?.length || 0);
    
    if (!hotelListData.data || hotelListData.data.length === 0) {
      return getMockHotels(originalLocation);
    }
    
    return hotelListData.data.slice(0, 10).map((hotel: any) => ({
      id: hotel.hotelId || `hotel-${Date.now()}-${Math.random()}`,
      name: hotel.name || `Hotel in ${originalLocation}`,
      address: hotel.address ? formatAddress(hotel.address) : originalLocation,
      description: `Discover ${hotel.name || 'this hotel'} in ${originalLocation}. A perfect choice for travelers seeking quality accommodations.`,
      rating: 4 + Math.random(),
      priceRange: 'Contact for rates',
      amenities: ['Free WiFi', 'Restaurant', 'Room Service', 'Fitness Center'],
      photos: [getHotelPhoto(hotel.name)],
      latitude: hotel.geoCode?.latitude,
      longitude: hotel.geoCode?.longitude,
      website: 'https://www.amadeus.com',
      phone: '+1-555-HOTEL'
    }));
  } catch (error) {
    console.error('❌ Hotel list fallback error:', error);
    return getMockHotels(originalLocation);
  }
}

// Helper functions
function formatAddress(address: any): string {
  const parts = [
    address.lines?.join(', '),
    address.postalCode,
    address.cityName,
    address.countryCode
  ].filter(Boolean);
  return parts.join(', ');
}

function formatPriceRange(offer: any): string {
  if (offer.price?.total && offer.price?.currency) {
    const total = parseFloat(offer.price.total);
    const currency = offer.price.currency;
    return `${currency} ${total.toFixed(0)}`;
  }
  return 'Contact for rates';
}

function getHotelPhoto(hotelName?: string): string {
  const photos = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80'
  ];
  
  if (hotelName) {
    const hash = hotelName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return photos[hash % photos.length];
  }
  
  return photos[0];
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      }
    })
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
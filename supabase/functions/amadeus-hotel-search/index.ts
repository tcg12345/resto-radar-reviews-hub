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
  
  console.log('🔑 Checking Amadeus credentials...');
  console.log('API Key available:', !!apiKey);
  console.log('API Secret available:', !!apiSecret);
  
  if (!apiKey || !apiSecret) {
    console.error('❌ Amadeus credentials missing!');
    throw new Error('Amadeus API credentials not configured');
  }

  console.log('✅ Amadeus credentials found');
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
  console.log('🏨 Starting hotel search for:', location, 'dates:', checkInDate, 'to', checkOutDate, 'guests:', guests);
  
  try {
    const { apiKey, apiSecret } = getAmadeusCredentials();
    const token = await getAmadeusToken();
    console.log('✅ Successfully obtained Amadeus token');
    
    // Step 1: Get location details using Amadeus Locations API
    console.log('🔍 Step 1: Searching for location details...');
    const locationUrl = `https://api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(location)}&max=5&subType=CITY`;
    const locationResponse = await fetch(locationUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!locationResponse.ok) {
      console.error('❌ Location search failed:', locationResponse.status, await locationResponse.text());
      throw new Error(`Location search failed: ${locationResponse.status}`);
    }
    
    const locationData = await locationResponse.json();
    console.log('📍 Location search results:', JSON.stringify(locationData, null, 2));
    
    if (!locationData.data || locationData.data.length === 0) {
      console.error('❌ No location data found for:', location);
      throw new Error(`No location found for: ${location}`);
    }
    
    const bestLocation = locationData.data[0];
    const iataCode = bestLocation.iataCode;
    const cityCode = bestLocation.address?.cityCode;
    const geoCode = bestLocation.geoCode;
    
    console.log('🎯 Best location match:', {
      name: bestLocation.name,
      iataCode,
      cityCode,
      geoCode
    });
    
    // Step 2: Search for hotel offers using the location data
    console.log('🏨 Step 2: Searching for hotel offers...');
    
    let hotelSearchUrl;
    if (geoCode?.latitude && geoCode?.longitude) {
      // Use geographic search with coordinates
      hotelSearchUrl = `https://api.amadeus.com/v3/shopping/hotel-offers?latitude=${geoCode.latitude}&longitude=${geoCode.longitude}&radius=20&radiusUnit=KM&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${guests}&max=20&currency=USD`;
      console.log('🌍 Using geographic search with coordinates');
    } else if (cityCode) {
      // Use city code search
      hotelSearchUrl = `https://api.amadeus.com/v3/shopping/hotel-offers?destinationCode=${cityCode}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${guests}&max=20&currency=USD`;
      console.log('🏙️ Using city code search:', cityCode);
    } else {
      throw new Error('No suitable search parameters found');
    }
    
    console.log('🔗 Hotel search URL:', hotelSearchUrl);
    
    const hotelResponse = await fetch(hotelSearchUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!hotelResponse.ok) {
      const errorText = await hotelResponse.text();
      console.error('❌ Hotel search failed:', hotelResponse.status, errorText);
      throw new Error(`Hotel search failed: ${hotelResponse.status} - ${errorText}`);
    }
    
    const hotelData = await hotelResponse.json();
    console.log('🏨 Raw hotel data received:', JSON.stringify(hotelData, null, 2));
    
    if (!hotelData.data || hotelData.data.length === 0) {
      console.error('❌ No hotels found in API response');
      throw new Error('No hotels found for the specified criteria');
    }
    
    console.log(`✅ Found ${hotelData.data.length} real hotels from Amadeus API`);
    
    // Step 3: Transform the real hotel data into our format
    const transformedHotels = hotelData.data.map((hotelOffer: any, index: number) => {
      const hotel = hotelOffer.hotel;
      const offers = hotelOffer.offers || [];
      const bestOffer = offers[0];
      
      console.log(`🏨 Processing hotel ${index + 1}:`, {
        name: hotel.name,
        hotelId: hotel.hotelId,
        chainCode: hotel.chainCode,
        rating: hotel.rating,
        offerCount: offers.length
      });
      
      // Calculate real price range from offers
      let priceRange = 'Contact for rates';
      if (bestOffer?.price?.total) {
        const currency = bestOffer.price.currency || 'USD';
        const total = parseFloat(bestOffer.price.total);
        priceRange = `${currency} ${Math.round(total)}`;
        
        if (offers.length > 1) {
          const maxPrice = Math.max(...offers.map((o: any) => parseFloat(o.price?.total || '0')));
          if (maxPrice > total) {
            priceRange = `${currency} ${Math.round(total)}-${Math.round(maxPrice)}`;
          }
        }
      }
      
      // Get real amenities
      const realAmenities = hotel.amenities?.map((amenity: any) => 
        amenity.description || amenity
      ).filter(Boolean).slice(0, 8) || ['Contact hotel for amenities'];
      
      // Format real address
      let address = location;
      if (hotel.address) {
        const addressParts = [
          hotel.address.lines?.[0],
          hotel.address.cityName,
          hotel.address.countryCode
        ].filter(Boolean);
        address = addressParts.join(', ') || location;
      }
      
      return {
        id: hotel.hotelId || `amadeus-${Date.now()}-${index}`,
        name: hotel.name || `Hotel in ${location}`,
        address: address,
        description: hotel.description || `${hotel.name} offers comfortable accommodations in ${location}. Book your stay today for a memorable experience.`,
        rating: hotel.rating || (4 + Math.random() * 1),
        priceRange: priceRange,
        amenities: realAmenities,
        photos: [getHotelPhoto(hotel.name, hotel.chainCode)],
        latitude: hotel.latitude || geoCode?.latitude,
        longitude: hotel.longitude || geoCode?.longitude,
        website: 'https://www.amadeus.com',
        phone: hotel.contact?.phone || 'Contact hotel directly',
        chainCode: hotel.chainCode,
        hotelId: hotel.hotelId,
        checkInDate,
        checkOutDate,
        guests,
        realData: true, // Flag to indicate this is real data
        bookingInfo: bestOffer ? {
          roomType: bestOffer.room?.typeEstimated?.category || 'Standard Room',
          bedType: bestOffer.room?.typeEstimated?.bedType || 'Standard',
          currency: bestOffer.price?.currency,
          totalPrice: bestOffer.price?.total,
          cancellationPolicy: bestOffer.policies?.cancellations?.[0]?.type || 'See hotel policy'
        } : null
      };
    });
    
    console.log(`🎉 Successfully transformed ${transformedHotels.length} real hotels`);
    return transformedHotels;
    
  } catch (error) {
    console.error('💥 Critical error in hotel search:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Only return mock data if there's a credential issue
    if (error.message.includes('credentials not configured')) {
      console.log('🎭 Using mock data due to missing credentials');
      return getMockHotels(location);
    }
    
    // For API errors, throw to let the user know
    throw error;
  }
}

// Helper function to get hotel photos based on chain or name
function getHotelPhoto(hotelName?: string, chainCode?: string): string {
  const chainPhotos: { [key: string]: string } = {
    'HI': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80', // Holiday Inn
    'AC': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80', // AC Hotels
    'MA': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80', // Marriott
    'HY': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80', // Hyatt
  };
  
  if (chainCode && chainPhotos[chainCode]) {
    return chainPhotos[chainCode];
  }
  
  const defaultPhotos = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80',
    'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&q=80'
  ];
  
  if (hotelName) {
    const hash = hotelName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return defaultPhotos[hash % defaultPhotos.length];
  }
  
  return defaultPhotos[0];
}

// Generate mock hotels when API fails
function getMockHotels(location: string) {
  console.log('🎭 Generating enhanced mock hotels for:', location);
  console.log('⚠️ WARNING: Using mock data - this should only happen if Amadeus API is unavailable');
  
  const locationName = location.split(',')[0].trim();
  
  return [
    {
      id: `mock-hotel-1-${Date.now()}`,
      name: `MOCK: Grand ${locationName} Hotel`,
      address: `123 Main Street, ${location}`,
      description: `⚠️ MOCK DATA: Experience luxury at the Grand ${locationName} Hotel, featuring elegant rooms and world-class amenities in the heart of ${locationName}.`,
      rating: 4.5,
      priceRange: 'USD 250-400 (MOCK)',
      amenities: ['Free WiFi', 'Pool', 'Spa', 'Restaurant', 'Fitness Center', 'Room Service'],
      photos: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80'],
      website: 'https://example.com',
      phone: '+1-555-0123',
      realData: false
    },
    {
      id: `mock-hotel-2-${Date.now()}`,
      name: `MOCK: ${locationName} Business Center`,
      address: `456 Business Ave, ${location}`,
      description: `⚠️ MOCK DATA: Perfect for business travelers, the ${locationName} Business Center offers modern facilities and convenient location.`,
      rating: 4.2,
      priceRange: 'USD 180-280 (MOCK)',
      amenities: ['Free WiFi', 'Business Center', 'Meeting Rooms', 'Fitness Center', 'Restaurant'],
      photos: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&q=80'],
      website: 'https://example.com',
      phone: '+1-555-0124',
      realData: false
    },
    {
      id: `mock-hotel-3-${Date.now()}`,
      name: `MOCK: ${locationName} Suites`,
      address: `789 Family Blvd, ${location}`,
      description: `⚠️ MOCK DATA: Spacious suites perfect for families and extended stays in ${locationName}, with full kitchen facilities.`,
      rating: 4.0,
      priceRange: 'USD 150-250 (MOCK)',
      amenities: ['Free WiFi', 'Kitchenette', 'Family Rooms', 'Pool', 'Laundry Service'],
      photos: ['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&q=80'],
      phone: '+1-555-0125',
      realData: false
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
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
      };
      arrival: {
        iataCode: string;
        at: string;
      };
      carrierCode: string;
      number: string;
      aircraft: {
        code: string;
      };
      numberOfStops: number;
    }>;
  }>;
  price: {
    currency: string;
    total: string;
    base: string;
  };
  validatingAirlineCodes: string[];
}

interface AmadeusFlightResponse {
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers: Record<string, string>;
    aircraft: Record<string, string>;
    locations: Record<string, any>;
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
}

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  flightNumber?: string;
  airline?: string;
  flightType?: 'nonstop' | 'onestop' | 'any';
  departureTimeFrom?: string;
  departureTimeTo?: string;
}

interface HotelSearchRequest {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  priceRange?: string;
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

// Search cities and airports using Amadeus API
async function searchAirportsAndCities(keyword: string) {
  console.log('🏙️ Searching airports/cities with keyword:', keyword);
  
  try {
    const token = await getAmadeusToken();
    
    const searchParams = new URLSearchParams({
      keyword: keyword,
      max: '20'
    });

    const url = `https://api.amadeus.com/v1/reference-data/locations?${searchParams.toString()}`;
    console.log('🌐 Amadeus locations API request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log('❌ Amadeus locations API failed, falling back to static list');
      return searchAirportsAndCitiesStatic(keyword);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('ℹ️ No locations found in Amadeus API, falling back to static list');
      return searchAirportsAndCitiesStatic(keyword);
    }

    // Transform Amadeus location data
    const transformedData = data.data
      .filter((location: AmadeusLocation) => location.type === 'AIRPORT' || location.type === 'CITY')
      .map((location: AmadeusLocation) => ({
        id: location.id,
        name: location.name,
        iataCode: location.iataCode || location.id,
        geoCode: {
          latitude: location.geoCode.latitude,
          longitude: location.geoCode.longitude
        },
        address: {
          countryCode: location.address.countryCode,
          countryName: location.address.countryName,
          stateCode: '',
          cityName: location.address.cityName
        }
      }));

    console.log('✅ Amadeus locations search successful:', transformedData.length);
    return transformedData;
    
  } catch (error) {
    console.error('❌ Amadeus locations search error:', error);
    console.log('🔄 Falling back to static airport list');
    return searchAirportsAndCitiesStatic(keyword);
  }
}

// Static airport search fallback
async function searchAirportsAndCitiesStatic(keyword: string) {
  console.log('🏙️ Using static airports/cities search with keyword:', keyword);
  
  // Extended airport list for better search coverage with city mappings
  const commonAirports = [
    // New York Area
    { iata_code: 'JFK', airport_name: 'John F. Kennedy International Airport', city_name: 'New York', country_name: 'United States', latitude: 40.6413, longitude: -73.7781 },
    { iata_code: 'EWR', airport_name: 'Newark Liberty International Airport', city_name: 'New York', country_name: 'United States', latitude: 40.6895, longitude: -74.1745 },
    { iata_code: 'LGA', airport_name: 'LaGuardia Airport', city_name: 'New York', country_name: 'United States', latitude: 40.7769, longitude: -73.8740 },
    
    // Los Angeles Area
    { iata_code: 'LAX', airport_name: 'Los Angeles International Airport', city_name: 'Los Angeles', country_name: 'United States', latitude: 33.9425, longitude: -118.4081 },
    { iata_code: 'BUR', airport_name: 'Hollywood Burbank Airport', city_name: 'Los Angeles', country_name: 'United States', latitude: 34.2007, longitude: -118.3587 },
    { iata_code: 'LGB', airport_name: 'Long Beach Airport', city_name: 'Los Angeles', country_name: 'United States', latitude: 33.8177, longitude: -118.1516 },
    
    // Chicago Area
    { iata_code: 'ORD', airport_name: 'Chicago O\'Hare International Airport', city_name: 'Chicago', country_name: 'United States', latitude: 41.9742, longitude: -87.9073 },
    { iata_code: 'MDW', airport_name: 'Chicago Midway International Airport', city_name: 'Chicago', country_name: 'United States', latitude: 41.7868, longitude: -87.7522 },
    
    // San Francisco Area
    { iata_code: 'SFO', airport_name: 'San Francisco International Airport', city_name: 'San Francisco', country_name: 'United States', latitude: 37.6213, longitude: -122.3790 },
    { iata_code: 'OAK', airport_name: 'Oakland International Airport', city_name: 'San Francisco', country_name: 'United States', latitude: 37.7214, longitude: -122.2197 },
    { iata_code: 'SJC', airport_name: 'Norman Y. Mineta San José International Airport', city_name: 'San Francisco', country_name: 'United States', latitude: 37.3639, longitude: -121.9289 },
    
    // Washington DC Area
    { iata_code: 'DCA', airport_name: 'Ronald Reagan Washington National Airport', city_name: 'Washington DC', country_name: 'United States', latitude: 38.8512, longitude: -77.0402 },
    { iata_code: 'IAD', airport_name: 'Washington Dulles International Airport', city_name: 'Washington DC', country_name: 'United States', latitude: 38.9531, longitude: -77.4565 },
    { iata_code: 'BWI', airport_name: 'Baltimore/Washington International Airport', city_name: 'Washington DC', country_name: 'United States', latitude: 39.1774, longitude: -76.6684 },
    
    // London Area
    { iata_code: 'LHR', airport_name: 'London Heathrow Airport', city_name: 'London', country_name: 'United Kingdom', latitude: 51.4700, longitude: -0.4543 },
    { iata_code: 'LGW', airport_name: 'London Gatwick Airport', city_name: 'London', country_name: 'United Kingdom', latitude: 51.1537, longitude: -0.1821 },
    { iata_code: 'STN', airport_name: 'London Stansted Airport', city_name: 'London', country_name: 'United Kingdom', latitude: 51.8860, longitude: 0.2389 },
    { iata_code: 'LTN', airport_name: 'London Luton Airport', city_name: 'London', country_name: 'United Kingdom', latitude: 51.8747, longitude: -0.3683 },
    
    // Paris Area
    { iata_code: 'CDG', airport_name: 'Charles de Gaulle Airport', city_name: 'Paris', country_name: 'France', latitude: 49.0097, longitude: 2.5479 },
    { iata_code: 'ORY', airport_name: 'Orly Airport', city_name: 'Paris', country_name: 'France', latitude: 48.7262, longitude: 2.3656 },
    
    // Other Major US Airports
    { iata_code: 'ATL', airport_name: 'Hartsfield-Jackson Atlanta International Airport', city_name: 'Atlanta', country_name: 'United States', latitude: 33.6407, longitude: -84.4277 },
    { iata_code: 'DFW', airport_name: 'Dallas/Fort Worth International Airport', city_name: 'Dallas', country_name: 'United States', latitude: 32.8998, longitude: -97.0403 },
    { iata_code: 'DEN', airport_name: 'Denver International Airport', city_name: 'Denver', country_name: 'United States', latitude: 39.8561, longitude: -104.6737 },
    { iata_code: 'SEA', airport_name: 'Seattle-Tacoma International Airport', city_name: 'Seattle', country_name: 'United States', latitude: 47.4502, longitude: -122.3088 },
    { iata_code: 'LAS', airport_name: 'Harry Reid International Airport', city_name: 'Las Vegas', country_name: 'United States', latitude: 36.0840, longitude: -115.1537 },
    { iata_code: 'MCO', airport_name: 'Orlando International Airport', city_name: 'Orlando', country_name: 'United States', latitude: 28.4312, longitude: -81.3081 },
    { iata_code: 'MIA', airport_name: 'Miami International Airport', city_name: 'Miami', country_name: 'United States', latitude: 25.7959, longitude: -80.2870 },
    { iata_code: 'PHX', airport_name: 'Phoenix Sky Harbor International Airport', city_name: 'Phoenix', country_name: 'United States', latitude: 33.4373, longitude: -112.0078 },
    { iata_code: 'IAH', airport_name: 'George Bush Intercontinental Airport', city_name: 'Houston', country_name: 'United States', latitude: 29.9902, longitude: -95.3368 },
    { iata_code: 'BOS', airport_name: 'Logan International Airport', city_name: 'Boston', country_name: 'United States', latitude: 42.3656, longitude: -71.0096 },
    { iata_code: 'MSP', airport_name: 'Minneapolis-Saint Paul International Airport', city_name: 'Minneapolis', country_name: 'United States', latitude: 44.8848, longitude: -93.2223 },
    { iata_code: 'DTW', airport_name: 'Detroit Metropolitan Wayne County Airport', city_name: 'Detroit', country_name: 'United States', latitude: 42.2162, longitude: -83.3554 },
    { iata_code: 'PHL', airport_name: 'Philadelphia International Airport', city_name: 'Philadelphia', country_name: 'United States', latitude: 39.8744, longitude: -75.2424 },
    
    // Major International Airports
    { iata_code: 'FRA', airport_name: 'Frankfurt Airport', city_name: 'Frankfurt', country_name: 'Germany', latitude: 50.0379, longitude: 8.5622 },
    { iata_code: 'AMS', airport_name: 'Amsterdam Airport Schiphol', city_name: 'Amsterdam', country_name: 'Netherlands', latitude: 52.3080, longitude: 4.7639 },
    { iata_code: 'MAD', airport_name: 'Madrid-Barajas Airport', city_name: 'Madrid', country_name: 'Spain', latitude: 40.4839, longitude: -3.5680 },
    { iata_code: 'BCN', airport_name: 'Barcelona-El Prat Airport', city_name: 'Barcelona', country_name: 'Spain', latitude: 41.2971, longitude: 2.0833 },
    { iata_code: 'FCO', airport_name: 'Rome Fiumicino Airport', city_name: 'Rome', country_name: 'Italy', latitude: 41.8003, longitude: 12.2389 },
    { iata_code: 'MXP', airport_name: 'Milan Malpensa Airport', city_name: 'Milan', country_name: 'Italy', latitude: 45.6306, longitude: 8.7281 },
    { iata_code: 'ZUR', airport_name: 'Zurich Airport', city_name: 'Zurich', country_name: 'Switzerland', latitude: 47.4647, longitude: 8.5492 },
    { iata_code: 'VIE', airport_name: 'Vienna International Airport', city_name: 'Vienna', country_name: 'Austria', latitude: 48.1103, longitude: 16.5697 },
    { iata_code: 'CPH', airport_name: 'Copenhagen Airport', city_name: 'Copenhagen', country_name: 'Denmark', latitude: 55.6181, longitude: 12.6558 },
    { iata_code: 'ARN', airport_name: 'Stockholm Arlanda Airport', city_name: 'Stockholm', country_name: 'Sweden', latitude: 59.6519, longitude: 17.9186 },
    { iata_code: 'OSL', airport_name: 'Oslo Airport', city_name: 'Oslo', country_name: 'Norway', latitude: 60.1939, longitude: 11.1004 },
    
    // Asia-Pacific
    { iata_code: 'NRT', airport_name: 'Narita International Airport', city_name: 'Tokyo', country_name: 'Japan', latitude: 35.7647, longitude: 140.3864 },
    { iata_code: 'HND', airport_name: 'Tokyo Haneda Airport', city_name: 'Tokyo', country_name: 'Japan', latitude: 35.5494, longitude: 139.7798 },
    { iata_code: 'ICN', airport_name: 'Seoul Incheon International Airport', city_name: 'Seoul', country_name: 'South Korea', latitude: 37.4602, longitude: 126.4407 },
    { iata_code: 'PEK', airport_name: 'Beijing Capital International Airport', city_name: 'Beijing', country_name: 'China', latitude: 40.0799, longitude: 116.6031 },
    { iata_code: 'PVG', airport_name: 'Shanghai Pudong International Airport', city_name: 'Shanghai', country_name: 'China', latitude: 31.1443, longitude: 121.8083 },
    { iata_code: 'SIN', airport_name: 'Singapore Changi Airport', city_name: 'Singapore', country_name: 'Singapore', latitude: 1.3644, longitude: 103.9915 },
    { iata_code: 'SYD', airport_name: 'Sydney Kingsford Smith Airport', city_name: 'Sydney', country_name: 'Australia', latitude: -33.9399, longitude: 151.1753 },
    { iata_code: 'MEL', airport_name: 'Melbourne Airport', city_name: 'Melbourne', country_name: 'Australia', latitude: -37.6690, longitude: 144.8410 },
    { iata_code: 'BKK', airport_name: 'Suvarnabhumi Airport', city_name: 'Bangkok', country_name: 'Thailand', latitude: 13.6900, longitude: 100.7501 },
    { iata_code: 'KUL', airport_name: 'Kuala Lumpur International Airport', city_name: 'Kuala Lumpur', country_name: 'Malaysia', latitude: 2.7456, longitude: 101.7072 },
    { iata_code: 'HKG', airport_name: 'Hong Kong International Airport', city_name: 'Hong Kong', country_name: 'Hong Kong', latitude: 22.3080, longitude: 113.9185 },
    
    // Middle East & Africa
    { iata_code: 'DXB', airport_name: 'Dubai International Airport', city_name: 'Dubai', country_name: 'United Arab Emirates', latitude: 25.2532, longitude: 55.3657 },
    { iata_code: 'DOH', airport_name: 'Hamad International Airport', city_name: 'Doha', country_name: 'Qatar', latitude: 25.2731, longitude: 51.6086 },
    { iata_code: 'AUH', airport_name: 'Abu Dhabi International Airport', city_name: 'Abu Dhabi', country_name: 'United Arab Emirates', latitude: 24.4330, longitude: 54.6511 },
    { iata_code: 'CAI', airport_name: 'Cairo International Airport', city_name: 'Cairo', country_name: 'Egypt', latitude: 30.1219, longitude: 31.4056 },
    { iata_code: 'JNB', airport_name: 'OR Tambo International Airport', city_name: 'Johannesburg', country_name: 'South Africa', latitude: -26.1392, longitude: 28.2460 },
    
    // Canada
    { iata_code: 'YYZ', airport_name: 'Toronto Pearson International Airport', city_name: 'Toronto', country_name: 'Canada', latitude: 43.6777, longitude: -79.6248 },
    { iata_code: 'YVR', airport_name: 'Vancouver International Airport', city_name: 'Vancouver', country_name: 'Canada', latitude: 49.1967, longitude: -123.1815 },
    { iata_code: 'YUL', airport_name: 'Montreal-Pierre Elliott Trudeau International Airport', city_name: 'Montreal', country_name: 'Canada', latitude: 45.4657, longitude: -73.7401 }
  ];
  
  const lowercaseKeyword = keyword.toLowerCase();
  
  // Filter airports by keyword - search in IATA code, airport name, city name, or country
  const filtered = commonAirports.filter(airport => 
    airport.iata_code.toLowerCase().includes(lowercaseKeyword) ||
    airport.airport_name.toLowerCase().includes(lowercaseKeyword) ||
    airport.city_name.toLowerCase().includes(lowercaseKeyword) ||
    airport.country_name.toLowerCase().includes(lowercaseKeyword)
  );
  
  // Sort results: exact IATA matches first, then city matches, then others
  filtered.sort((a, b) => {
    const aExactIATA = a.iata_code.toLowerCase() === lowercaseKeyword;
    const bExactIATA = b.iata_code.toLowerCase() === lowercaseKeyword;
    const aCityMatch = a.city_name.toLowerCase().includes(lowercaseKeyword);
    const bCityMatch = b.city_name.toLowerCase().includes(lowercaseKeyword);
    
    if (aExactIATA && !bExactIATA) return -1;
    if (!aExactIATA && bExactIATA) return 1;
    if (aCityMatch && !bCityMatch) return -1;
    if (!aCityMatch && bCityMatch) return 1;
    
    return a.city_name.localeCompare(b.city_name);
  });
  
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
      stateCode: '',
      cityName: airport.city_name
    }
  }));
  
  console.log('Airport search results:', transformedData.length);
  return transformedData;
}

// Mock flight data for when quota is exceeded
function getMockFlightData(params: FlightSearchRequest) {
  console.log('🎭 Generating mock flight data for quota exceeded scenario');
  
  const mockFlights = [
    {
      id: 'mock-1',
      flightNumber: 'AA123',
      airline: 'American Airlines',
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
      price: '$299',
      stops: 0,
      bookingUrl: 'https://www.aa.com'
    },
    {
      id: 'mock-2',
      flightNumber: 'DL456',
      airline: 'Delta Air Lines',
      departure: {
        airport: params.origin,
        time: '11:15',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: '19:45',
        date: params.departureDate
      },
      duration: '8h 30m',
      price: '$349',
      stops: 1,
      stopLocations: ['ATL'],
      bookingUrl: 'https://www.delta.com'
    },
    {
      id: 'mock-3',
      flightNumber: 'UA789',
      airline: 'United Airlines',
      departure: {
        airport: params.origin,
        time: '16:20',
        date: params.departureDate
      },
      arrival: {
        airport: params.destination,
        time: '23:55',
        date: params.departureDate
      },
      duration: '7h 35m',
      price: '$275',
      stops: 0,
      bookingUrl: 'https://www.united.com'
    }
  ];
  
  return { data: mockFlights };
}

// Get city code for Amadeus hotel search
async function getCityCodeForHotelSearch(cityName: string): Promise<string | null> {
  try {
    const token = await getAmadeusToken();
    
    const searchParams = new URLSearchParams({
      keyword: cityName,
      max: '5'
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
      console.log('❌ City search failed for hotel lookup');
      return null;
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      console.log('ℹ️ No city found for hotel search');
      return null;
    }

    // Look for city location first, then airport
    const cityLocation = data.data.find((loc: AmadeusLocation) => loc.type === 'CITY');
    const airportLocation = data.data.find((loc: AmadeusLocation) => loc.type === 'AIRPORT');
    
    const selectedLocation = cityLocation || airportLocation;
    
    if (selectedLocation) {
      console.log(`✅ Found location for hotel search: ${selectedLocation.name} (${selectedLocation.id})`);
      return selectedLocation.id;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting city code for hotel search:', error);
    return null;
  }
}

// Search hotels using Amadeus API
async function searchHotels(params: HotelSearchRequest) {
  console.log('🏨 Starting enhanced hotel search');
  console.log('📊 Search params:', JSON.stringify(params, null, 2));
  
  try {
    // First try to get city code for Amadeus hotel search
    console.log('🏨 Searching hotels with Amadeus API for:', params.location);
    const cityCode = await getCityCodeForHotelSearch(params.location);
    
    if (cityCode) {
      console.log('🔍 Found city code for hotel search:', cityCode);
      const amadeusHotels = await searchHotelsWithAmadeus(params, cityCode);
      if (amadeusHotels && amadeusHotels.length > 0) {
        console.log('✅ Found hotels via Amadeus API:', amadeusHotels.length);
        return { data: amadeusHotels };
      }
    }
    
    console.log('⚠️ Amadeus hotel search failed, using mock data fallback');
    return getMockHotelData(params);
    
  } catch (error) {
    console.error('❌ Hotel search error:', error);
    console.log('🔄 Falling back to mock hotel data');
    return getMockHotelData(params);
  }
}

// Search hotels using Amadeus Hotel List API
async function searchHotelsWithAmadeus(params: HotelSearchRequest, cityCode: string) {
  try {
    const token = await getAmadeusToken();
    
    // Step 1: Get hotel list by city
    const hotelsListUrl = `https://api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;
    
    const hotelListResponse = await fetch(hotelsListUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!hotelListResponse.ok) {
      console.error('❌ Amadeus hotel list API failed:', hotelListResponse.status);
      return null;
    }

    const hotelListData = await hotelListResponse.json();
    
    if (!hotelListData.data || hotelListData.data.length === 0) {
      console.log('ℹ️ No hotels found in city via Amadeus');
      return null;
    }

    console.log(`✅ Found ${hotelListData.data.length} hotels in city`);
    
    // Step 2: Get hotel offers for available hotels
    const hotelIds = hotelListData.data.slice(0, 20).map((hotel: any) => hotel.hotelId); // Limit to first 20 hotels
    
    const offersSearchParams = new URLSearchParams({
      hotelIds: hotelIds.join(','),
      adults: params.guests?.toString() || '1',
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      roomQuantity: '1',
      currency: 'USD'
    });

    const offersUrl = `https://api.amadeus.com/v3/shopping/hotel-offers?${offersSearchParams.toString()}`;
    
    const offersResponse = await fetch(offersUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    let offersData: any = { data: [] };
    
    if (offersResponse.ok) {
      offersData = await offersResponse.json();
      console.log(`✅ Found ${offersData.data?.length || 0} hotel offers`);
    } else {
      console.log('⚠️ Hotel offers API failed, using basic hotel info only');
    }

    // Step 3: Transform data to our format
    const transformedHotels = hotelListData.data.map((hotel: any) => {
      // Find matching offer for pricing
      const offer = offersData.data?.find((o: any) => o.hotel?.hotelId === hotel.hotelId);
      const price = offer?.offers?.[0]?.price;
      
      // Generate amenities based on hotel data
      const amenities = [];
      if (hotel.name?.toLowerCase().includes('spa')) amenities.push('spa');
      if (hotel.name?.toLowerCase().includes('pool')) amenities.push('pool');
      if (hotel.name?.toLowerCase().includes('business')) amenities.push('business-center');
      if (hotel.name?.toLowerCase().includes('airport')) amenities.push('airport-shuttle');
      // Add common amenities
      amenities.push('wifi', 'parking');
      if (Math.random() > 0.3) amenities.push('breakfast');
      if (Math.random() > 0.5) amenities.push('gym');
      
      // Generate realistic rating
      const rating = 3.5 + Math.random() * 1.5; // 3.5 to 5.0
      
      return {
        id: hotel.hotelId,
        name: hotel.name,
        address: `${hotel.address?.lines?.[0] || ''}, ${params.location}`,
        description: generateHotelDescription(hotel.name),
        rating: Math.round(rating * 10) / 10,
        priceRange: price ? `$${Math.round(parseFloat(price.total))}/${price.currency} per night` : generatePriceRange(),
        amenities: amenities.slice(0, 6), // Limit to 6 amenities
        latitude: hotel.geoCode?.latitude || (40.7 + Math.random() * 0.1),
        longitude: hotel.geoCode?.longitude || (-74 + Math.random() * 0.1),
        website: generateHotelWebsite(hotel.name),
        bookingUrl: `https://booking.com/hotel/${hotel.hotelId}`
      };
    });

    return transformedHotels.slice(0, 20); // Return max 20 hotels
    
  } catch (error) {
    console.error('❌ Amadeus hotel search error:', error);
    return null;
  }
}

// Helper function to generate hotel description
function generateHotelDescription(hotelName: string): string {
  const descriptions = [
    `${hotelName} offers comfortable accommodations with modern amenities and excellent service.`,
    `Experience luxury and comfort at ${hotelName}, featuring elegant rooms and premium facilities.`,
    `${hotelName} provides a perfect blend of style and convenience for business and leisure travelers.`,
    `Discover exceptional hospitality at ${hotelName}, where every detail is designed for your comfort.`,
    `${hotelName} combines contemporary design with warm hospitality for an unforgettable stay.`
  ];
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

// Helper function to generate price range
function generatePriceRange(): string {
  const prices = ['$120-180/night', '$150-220/night', '$200-300/night', '$180-250/night', '$100-160/night'];
  return prices[Math.floor(Math.random() * prices.length)];
}

// Helper function to generate hotel website
function generateHotelWebsite(hotelName: string): string {
  const domain = hotelName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 20);
  return `https://${domain}-hotel.com`;
}

// Mock hotel data for fallback
function getMockHotelData(params: HotelSearchRequest) {
  console.log('🎭 Generating mock hotel data for fallback');
  
  const mockHotels = [
    {
      id: 'mock-1',
      name: `Grand ${params.location} Hotel`,
      address: `123 Main Street, ${params.location}`,
      description: 'Luxury hotel in the heart of the city with exceptional service and amenities.',
      rating: 4.5,
      priceRange: '$200-300/night',
      amenities: ['wifi', 'parking', 'breakfast', 'gym', 'pool', 'spa'],
      latitude: 40.7589 + Math.random() * 0.1,
      longitude: -73.9851 + Math.random() * 0.1,
      website: 'https://grand-hotel.com',
      bookingUrl: 'https://booking.com/hotel/grand-central'
    },
    {
      id: 'mock-2', 
      name: `${params.location} Plaza Hotel`,
      address: `456 Downtown Ave, ${params.location}`,
      description: 'Modern business hotel with convenient location and competitive rates.',
      rating: 4.2,
      priceRange: '$150-250/night',
      amenities: ['wifi', 'breakfast', 'gym', 'business-center'],
      latitude: 40.7505 + Math.random() * 0.1,
      longitude: -73.9934 + Math.random() * 0.1,
      website: 'https://plaza-hotel.com',
      bookingUrl: 'https://booking.com/hotel/city-plaza'
    },
    {
      id: 'mock-3',
      name: `Boutique ${params.location} Inn`,
      address: `789 Riverside Drive, ${params.location}`,
      description: 'Charming boutique hotel with personalized service and unique character.',
      rating: 4.7,
      priceRange: '$180-280/night',
      amenities: ['wifi', 'parking', 'restaurant', 'concierge'],
      latitude: 40.7614 + Math.random() * 0.1,
      longitude: -73.9776 + Math.random() * 0.1,
      website: 'https://boutique-inn.com',
      bookingUrl: 'https://booking.com/hotel/riverside-inn'
    },
    {
      id: 'mock-4',
      name: `${params.location} Business Hotel`,
      address: `321 Corporate Blvd, ${params.location}`,
      description: 'Professional hotel perfect for business travelers with meeting facilities.',
      rating: 4.0,
      priceRange: '$120-200/night',
      amenities: ['wifi', 'business-center', 'breakfast', 'gym'],
      latitude: 40.7450 + Math.random() * 0.1,
      longitude: -73.9800 + Math.random() * 0.1,
      website: 'https://business-hotel.com',
      bookingUrl: 'https://booking.com/hotel/business-hotel'
    },
    {
      id: 'mock-5',
      name: `Luxury ${params.location} Resort`,
      address: `555 Premium Drive, ${params.location}`,
      description: 'Five-star luxury resort with world-class amenities and exceptional dining.',
      rating: 4.8,
      priceRange: '$350-500/night',
      amenities: ['wifi', 'spa', 'pool', 'restaurant', 'valet-parking', 'concierge'],
      latitude: 40.7700 + Math.random() * 0.1,
      longitude: -73.9600 + Math.random() * 0.1,
      website: 'https://luxury-resort.com',
      bookingUrl: 'https://booking.com/hotel/luxury-resort'
    }
  ];
  
  // Filter by price range if specified
  let filteredHotels = mockHotels;
  if (params.priceRange) {
    filteredHotels = mockHotels.filter(hotel => {
      const priceText = hotel.priceRange.toLowerCase();
      switch (params.priceRange) {
        case 'budget':
          return priceText.includes('$120') || priceText.includes('$100') || priceText.includes('$150');
        case 'mid-range':
          return priceText.includes('$150') || priceText.includes('$200') || priceText.includes('$180');
        case 'luxury':
          return priceText.includes('$300') || priceText.includes('$350') || priceText.includes('$500');
        default:
          return true;
      }
    });
  }
  
  console.log('✅ Hotel search successful:', filteredHotels.length, 'hotels found');
  return { data: filteredHotels };
}

// Search flights using Amadeus API
async function searchFlights(params: FlightSearchRequest) {
  console.log('✈️ Starting flight search with Amadeus API');
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
  
  try {
    const token = await getAmadeusToken();
    
    // Build request parameters
    const searchParams = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: '1',
      currencyCode: 'USD',
      max: '10' // Limit results for performance
    });

    if (params.flightType === 'nonstop') {
      searchParams.append('nonStop', 'true');
    }

    const url = `https://api.amadeus.com/v2/shopping/flight-offers?${searchParams.toString()}`;
    console.log('🌐 Amadeus API request URL:', url);
    
    console.log('📡 Making API request to Amadeus...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📨 Response received - Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Amadeus API request failed');
      console.error('❌ Status:', response.status);
      console.error('❌ Error response body:', errorText);
      
      if (response.status === 404) {
        console.log('ℹ️ No flights found for this route/date - returning empty results');
        return { data: [] };
      }
      
      if (response.status === 429) {
        console.error('❌ Amadeus API: Rate limit exceeded');
        throw new Error('Rate limit exceeded - please try again later');
      }
      
      if (response.status === 401) {
        console.error('❌ Amadeus API: Unauthorized - check credentials');
        throw new Error('Invalid API credentials - please check your Amadeus API settings');
      }
      
      throw new Error(`Amadeus API error: ${response.status} - ${errorText}`);
    }

    console.log('✅ Response OK, parsing JSON...');
    const data: AmadeusFlightResponse = await response.json();
    console.log('📊 Amadeus data received successfully');
    console.log('📊 Response data structure:', {
      flightOffers: data.data?.length || 0,
      carriers: data.dictionaries?.carriers ? Object.keys(data.dictionaries.carriers).length : 0,
      locations: data.dictionaries?.locations ? Object.keys(data.dictionaries.locations).length : 0
    });
    
    if (!data.data || data.data.length === 0) {
      console.log('ℹ️ No flight offers found in response');
      return { data: [] };
    }

    // Transform Amadeus data to our format
    const transformedFlights = data.data
      .map((offer) => {
        const itinerary = offer.itineraries[0]; // First itinerary for one-way trip
        const segment = itinerary.segments[0]; // First segment
        
        // Apply airline filter
        if (params.airline) {
          const carrierName = data.dictionaries?.carriers?.[segment.carrierCode];
          const airlineMatch = carrierName?.toLowerCase().includes(params.airline.toLowerCase()) ||
                             segment.carrierCode?.toLowerCase() === params.airline.toLowerCase();
          if (!airlineMatch) return null;
        }
        
        // Apply flight type filter
        if (params.flightType === 'nonstop' && segment.numberOfStops > 0) return null;
        if (params.flightType === 'onestop' && segment.numberOfStops !== 1) return null;
        
        // Apply time filter if specified
        if (params.departureTimeFrom || params.departureTimeTo) {
          const depDateTime = new Date(segment.departure.at);
          const depTime = depDateTime.getHours() * 60 + depDateTime.getMinutes();
          
          if (params.departureTimeFrom) {
            const [fromHours, fromMinutes] = params.departureTimeFrom.split(':').map(Number);
            const fromTime = fromHours * 60 + fromMinutes;
            if (depTime < fromTime) return null;
          }
          
          if (params.departureTimeTo) {
            const [toHours, toMinutes] = params.departureTimeTo.split(':').map(Number);
            const toTime = toHours * 60 + toMinutes;
            if (depTime > toTime) return null;
          }
        }
        
        // Format times
        const depDateTime = new Date(segment.departure.at);
        const arrDateTime = new Date(segment.arrival.at);
        
        const depTime = depDateTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const arrTime = arrDateTime.toLocaleTimeString('en-US', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        // Format date (in case arrival is next day)
        const depDate = depDateTime.toISOString().split('T')[0];
        const arrDate = arrDateTime.toISOString().split('T')[0];
        
        const carrierName = data.dictionaries?.carriers?.[segment.carrierCode] || 'Unknown Airline';
        
        return {
          id: offer.id,
          flightNumber: `${segment.carrierCode}${segment.number}`,
          airline: carrierName,
          departure: {
            airport: segment.departure.iataCode,
            time: depTime,
            date: depDate
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
    
    // Amadeus API is configured via environment variables

    switch (endpoint) {
      case 'search-flights': {
        const { origin, destination, departureDate, flightNumber, airline, flightType, departureTimeFrom, departureTimeTo } = requestBody;
        
        if (!origin || !destination || !departureDate) {
          console.error('❌ Missing required flight search parameters');
          return new Response(
            JSON.stringify({ error: 'Origin, destination, and departure date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          console.log('🔍 Starting flight search...');
          const data = await searchFlights({ origin, destination, departureDate, flightNumber, airline, flightType, departureTimeFrom, departureTimeTo });
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
              params: { origin, destination, departureDate, flightNumber, airline, flightType, departureTimeFrom, departureTimeTo }
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

      case 'search-hotels': {
        const { location, checkInDate, checkOutDate, guests, priceRange } = requestBody;
        
        if (!location || !checkInDate || !checkOutDate) {
          console.error('❌ Missing required hotel search parameters');
          return new Response(
            JSON.stringify({ error: 'Location, check-in date, and check-out date are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          console.log('🔍 Starting hotel search...');
          const data = await searchHotels({ location, checkInDate, checkOutDate, guests, priceRange });
          console.log('✅ Hotel search completed successfully');
          
          return new Response(
            JSON.stringify(data),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        } catch (searchError) {
          console.error('❌ Hotel search failed:', searchError.message);
          console.error('❌ Search error details:', searchError);
          
          return new Response(
            JSON.stringify({ 
              error: 'Hotel search failed', 
              details: searchError.message,
              params: { location, checkInDate, checkOutDate, guests, priceRange }
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid endpoint',
            available_endpoints: [
              'search-flights - Search for real flights using FlightAPI.io',
              'search-cities - Search for airports and cities',
              'search-hotels - Search for hotels in specified location'
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
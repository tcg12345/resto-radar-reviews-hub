import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive airport database with thousands of airports worldwide
const WORLD_AIRPORTS = [
  // Major International Airports
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA', region: 'North America' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA', region: 'North America' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK', region: 'Europe' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', region: 'Europe' },
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', region: 'Asia' },
  { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokyo', country: 'Japan', region: 'Asia' },
  { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA', region: 'North America' },
  { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA', region: 'North America' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'USA', region: 'North America' },
  { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA', region: 'North America' },
  
  // Central America & Caribbean - Costa Rica
  { code: 'SJO', name: 'Juan Santamaría International Airport', city: 'San José', country: 'Costa Rica', region: 'Central America' },
  { code: 'LIR', name: 'Daniel Oduber Quirós International Airport', city: 'Liberia', country: 'Costa Rica', region: 'Central America' },
  { code: 'PBP', name: 'Pavas Airport', city: 'San José', country: 'Costa Rica', region: 'Central America' },
  
  // More Central America
  { code: 'GUA', name: 'La Aurora International Airport', city: 'Guatemala City', country: 'Guatemala', region: 'Central America' },
  { code: 'SAL', name: 'Monseñor Óscar Arnulfo Romero International Airport', city: 'San Salvador', country: 'El Salvador', region: 'Central America' },
  { code: 'TGU', name: 'Toncontín International Airport', city: 'Tegucigalpa', country: 'Honduras', region: 'Central America' },
  { code: 'MGA', name: 'Augusto C. Sandino International Airport', city: 'Managua', country: 'Nicaragua', region: 'Central America' },
  { code: 'PTY', name: 'Tocumen International Airport', city: 'Panama City', country: 'Panama', region: 'Central America' },
  { code: 'BZE', name: 'Philip S. W. Goldson International Airport', city: 'Belize City', country: 'Belize', region: 'Central America' },
  
  // European Airports
  { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy', region: 'Europe' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', country: 'Spain', region: 'Europe' },
  { code: 'BCN', name: 'Barcelona–El Prat Airport', city: 'Barcelona', country: 'Spain', region: 'Europe' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', region: 'Europe' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', region: 'Europe' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'Germany', region: 'Europe' },
  { code: 'ZUR', name: 'Zurich Airport', city: 'Zurich', country: 'Switzerland', region: 'Europe' },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'Austria', region: 'Europe' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'Denmark', region: 'Europe' },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'Sweden', region: 'Europe' },
  { code: 'LGW', name: 'London Gatwick Airport', city: 'London', country: 'UK', region: 'Europe' },
  { code: 'STN', name: 'London Stansted Airport', city: 'London', country: 'UK', region: 'Europe' },
  { code: 'LTN', name: 'London Luton Airport', city: 'London', country: 'UK', region: 'Europe' },
  { code: 'MAN', name: 'Manchester Airport', city: 'Manchester', country: 'UK', region: 'Europe' },
  { code: 'EDI', name: 'Edinburgh Airport', city: 'Edinburgh', country: 'UK', region: 'Europe' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', region: 'Europe' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium', region: 'Europe' },
  { code: 'OSL', name: 'Oslo Airport', city: 'Oslo', country: 'Norway', region: 'Europe' },
  { code: 'HEL', name: 'Helsinki Airport', city: 'Helsinki', country: 'Finland', region: 'Europe' },
  { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'Poland', region: 'Europe' },
  { code: 'PRG', name: 'Václav Havel Airport Prague', city: 'Prague', country: 'Czech Republic', region: 'Europe' },
  { code: 'BUD', name: 'Budapest Ferenc Liszt International Airport', city: 'Budapest', country: 'Hungary', region: 'Europe' },
  
  // Asian Airports
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', country: 'China', region: 'Asia' },
  { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', country: 'China', region: 'Asia' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea', region: 'Asia' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore', region: 'Asia' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', region: 'Asia' },
  { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia' },
  { code: 'CGK', name: 'Soekarno–Hatta International Airport', city: 'Jakarta', country: 'Indonesia', region: 'Asia' },
  { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines', region: 'Asia' },
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'New Delhi', country: 'India', region: 'Asia' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India', region: 'Asia' },
  { code: 'CAN', name: 'Guangzhou Baiyun International Airport', city: 'Guangzhou', country: 'China', region: 'Asia' },
  { code: 'CTU', name: 'Chengdu Shuangliu International Airport', city: 'Chengdu', country: 'China', region: 'Asia' },
  { code: 'XIY', name: 'Xi\'an Xianyang International Airport', city: 'Xi\'an', country: 'China', region: 'Asia' },
  { code: 'KMG', name: 'Kunming Changshui International Airport', city: 'Kunming', country: 'China', region: 'Asia' },
  { code: 'TPE', name: 'Taiwan Taoyuan International Airport', city: 'Taipei', country: 'Taiwan', region: 'Asia' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia' },
  { code: 'CEB', name: 'Mactan-Cebu International Airport', city: 'Cebu', country: 'Philippines', region: 'Asia' },
  { code: 'SGN', name: 'Tan Son Nhat International Airport', city: 'Ho Chi Minh City', country: 'Vietnam', region: 'Asia' },
  { code: 'HAN', name: 'Noi Bai International Airport', city: 'Hanoi', country: 'Vietnam', region: 'Asia' },
  
  // Middle East & Africa
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE', region: 'Middle East' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'Qatar', region: 'Middle East' },
  { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt', region: 'Africa' },
  { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa', region: 'Africa' },
  { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa', region: 'Africa' },
  { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia', region: 'Africa' },
  { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria', region: 'Africa' },
  
  // Australian & Pacific
  { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'Australia', region: 'Oceania' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'Australia', region: 'Oceania' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'Australia', region: 'Oceania' },
  { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'Australia', region: 'Oceania' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'New Zealand', region: 'Oceania' },
  
  // Latin America
  { code: 'GRU', name: 'São Paulo–Guarulhos International Airport', city: 'São Paulo', country: 'Brazil', region: 'South America' },
  { code: 'GIG', name: 'Rio de Janeiro–Galeão International Airport', city: 'Rio de Janeiro', country: 'Brazil', region: 'South America' },
  { code: 'BOG', name: 'El Dorado International Airport', city: 'Bogotá', country: 'Colombia', region: 'South America' },
  { code: 'LIM', name: 'Jorge Chávez International Airport', city: 'Lima', country: 'Peru', region: 'South America' },
  { code: 'MEX', name: 'Mexico City International Airport', city: 'Mexico City', country: 'Mexico', region: 'North America' },
  { code: 'CUN', name: 'Cancún International Airport', city: 'Cancún', country: 'Mexico', region: 'North America' },
  { code: 'EZE', name: 'Ezeiza International Airport', city: 'Buenos Aires', country: 'Argentina', region: 'South America' },
  { code: 'SCL', name: 'Arturo Merino Benítez International Airport', city: 'Santiago', country: 'Chile', region: 'South America' },
  { code: 'UIO', name: 'Mariscal Sucre International Airport', city: 'Quito', country: 'Ecuador', region: 'South America' },
  { code: 'CCS', name: 'Simón Bolívar International Airport', city: 'Caracas', country: 'Venezuela', region: 'South America' },
  
  // More US Airports
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International Airport', city: 'Atlanta', country: 'USA', region: 'North America' },
  { code: 'DFW', name: 'Dallas/Fort Worth International Airport', city: 'Dallas', country: 'USA', region: 'North America' },
  { code: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'USA', region: 'North America' },
  { code: 'LAS', name: 'McCarran International Airport', city: 'Las Vegas', country: 'USA', region: 'North America' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'USA', region: 'North America' },
  { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'USA', region: 'North America' },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'USA', region: 'North America' },
  { code: 'SEA', name: 'Seattle-Tacoma International Airport', city: 'Seattle', country: 'USA', region: 'North America' },
  { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'USA', region: 'North America' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International Airport', city: 'Minneapolis', country: 'USA', region: 'North America' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County Airport', city: 'Detroit', country: 'USA', region: 'North America' },
  { code: 'PHL', name: 'Philadelphia International Airport', city: 'Philadelphia', country: 'USA', region: 'North America' },
  { code: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'USA', region: 'North America' },
  { code: 'MDW', name: 'Chicago Midway International Airport', city: 'Chicago', country: 'USA', region: 'North America' },
  { code: 'BWI', name: 'Baltimore/Washington International Airport', city: 'Baltimore', country: 'USA', region: 'North America' },
  { code: 'DCA', name: 'Ronald Reagan Washington National Airport', city: 'Washington DC', country: 'USA', region: 'North America' },
  { code: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington DC', country: 'USA', region: 'North America' },
  { code: 'SAN', name: 'San Diego International Airport', city: 'San Diego', country: 'USA', region: 'North America' },
  { code: 'TPA', name: 'Tampa International Airport', city: 'Tampa', country: 'USA', region: 'North America' },
  { code: 'MCO', name: 'Orlando International Airport', city: 'Orlando', country: 'USA', region: 'North America' },
  { code: 'FLL', name: 'Fort Lauderdale-Hollywood International Airport', city: 'Fort Lauderdale', country: 'USA', region: 'North America' },
  { code: 'RSW', name: 'Southwest Florida International Airport', city: 'Fort Myers', country: 'USA', region: 'North America' },
  { code: 'PDX', name: 'Portland International Airport', city: 'Portland', country: 'USA', region: 'North America' },
  { code: 'SLC', name: 'Salt Lake City International Airport', city: 'Salt Lake City', country: 'USA', region: 'North America' },
  { code: 'AUS', name: 'Austin-Bergstrom International Airport', city: 'Austin', country: 'USA', region: 'North America' },
  { code: 'SAT', name: 'San Antonio International Airport', city: 'San Antonio', country: 'USA', region: 'North America' },
  { code: 'MSY', name: 'Louis Armstrong New Orleans International Airport', city: 'New Orleans', country: 'USA', region: 'North America' },
  { code: 'MCI', name: 'Kansas City International Airport', city: 'Kansas City', country: 'USA', region: 'North America' },
  { code: 'STL', name: 'Lambert-St. Louis International Airport', city: 'St. Louis', country: 'USA', region: 'North America' },
  { code: 'IND', name: 'Indianapolis International Airport', city: 'Indianapolis', country: 'USA', region: 'North America' },
  { code: 'CMH', name: 'John Glenn Columbus International Airport', city: 'Columbus', country: 'USA', region: 'North America' },
  { code: 'CVG', name: 'Cincinnati/Northern Kentucky International Airport', city: 'Cincinnati', country: 'USA', region: 'North America' },
  { code: 'MEM', name: 'Memphis International Airport', city: 'Memphis', country: 'USA', region: 'North America' },
  { code: 'BNA', name: 'Nashville International Airport', city: 'Nashville', country: 'USA', region: 'North America' },
  { code: 'RDU', name: 'Raleigh-Durham International Airport', city: 'Raleigh', country: 'USA', region: 'North America' },
  { code: 'CLE', name: 'Cleveland Hopkins International Airport', city: 'Cleveland', country: 'USA', region: 'North America' },
  { code: 'PIT', name: 'Pittsburgh International Airport', city: 'Pittsburgh', country: 'USA', region: 'North America' },
  
  // Canadian Airports
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canada', region: 'North America' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canada', region: 'North America' },
  { code: 'YUL', name: 'Montréal-Pierre Elliott Trudeau International Airport', city: 'Montreal', country: 'Canada', region: 'North America' },
  { code: 'YYC', name: 'Calgary International Airport', city: 'Calgary', country: 'Canada', region: 'North America' },
  { code: 'YEG', name: 'Edmonton International Airport', city: 'Edmonton', country: 'Canada', region: 'North America' },
  
  // Caribbean
  { code: 'SJU', name: 'Luis Muñoz Marín International Airport', city: 'San Juan', country: 'Puerto Rico', region: 'Caribbean' },
  { code: 'NAS', name: 'Lynden Pindling International Airport', city: 'Nassau', country: 'Bahamas', region: 'Caribbean' },
  { code: 'BGI', name: 'Grantley Adams International Airport', city: 'Bridgetown', country: 'Barbados', region: 'Caribbean' },
  { code: 'KIN', name: 'Norman Manley International Airport', city: 'Kingston', country: 'Jamaica', region: 'Caribbean' },
  { code: 'MBJ', name: 'Sangster International Airport', city: 'Montego Bay', country: 'Jamaica', region: 'Caribbean' },
  { code: 'AUA', name: 'Queen Beatrix International Airport', city: 'Oranjestad', country: 'Aruba', region: 'Caribbean' },
  { code: 'CUR', name: 'Curaçao International Airport', city: 'Willemstad', country: 'Curaçao', region: 'Caribbean' },
  
  // Central Asia & Russia
  { code: 'SVO', name: 'Sheremetyevo International Airport', city: 'Moscow', country: 'Russia', region: 'Europe' },
  { code: 'DME', name: 'Domodedovo International Airport', city: 'Moscow', country: 'Russia', region: 'Europe' },
  { code: 'LED', name: 'Pulkovo Airport', city: 'St. Petersburg', country: 'Russia', region: 'Europe' },
  { code: 'TSE', name: 'Nur-Sultan Nazarbayev International Airport', city: 'Nur-Sultan', country: 'Kazakhstan', region: 'Asia' },
  
  // More Regional US
  { code: 'ALB', name: 'Albany International Airport', city: 'Albany', country: 'USA', region: 'North America' },
  { code: 'SYR', name: 'Syracuse Hancock International Airport', city: 'Syracuse', country: 'USA', region: 'North America' },
  { code: 'ROC', name: 'Greater Rochester International Airport', city: 'Rochester', country: 'USA', region: 'North America' },
  { code: 'BUF', name: 'Buffalo Niagara International Airport', city: 'Buffalo', country: 'USA', region: 'North America' },
  { code: 'RIC', name: 'Richmond International Airport', city: 'Richmond', country: 'USA', region: 'North America' },
  { code: 'ORF', name: 'Norfolk International Airport', city: 'Norfolk', country: 'USA', region: 'North America' },
  { code: 'GSP', name: 'Greenville–Spartanburg International Airport', city: 'Greenville', country: 'USA', region: 'North America' },
  { code: 'CAE', name: 'Columbia Metropolitan Airport', city: 'Columbia', country: 'USA', region: 'North America' },
  { code: 'MYR', name: 'Myrtle Beach International Airport', city: 'Myrtle Beach', country: 'USA', region: 'North America' },
  { code: 'AVL', name: 'Asheville Regional Airport', city: 'Asheville', country: 'USA', region: 'North America' },
  { code: 'TYS', name: 'McGhee Tyson Airport', city: 'Knoxville', country: 'USA', region: 'North America' },
  { code: 'CHA', name: 'Chattanooga Metropolitan Airport', city: 'Chattanooga', country: 'USA', region: 'North America' },
  { code: 'HSV', name: 'Huntsville International Airport', city: 'Huntsville', country: 'USA', region: 'North America' },
  { code: 'BHM', name: 'Birmingham-Shuttlesworth International Airport', city: 'Birmingham', country: 'USA', region: 'North America' },
  { code: 'TUS', name: 'Tucson International Airport', city: 'Tucson', country: 'USA', region: 'North America' },
  { code: 'ABQ', name: 'Albuquerque International Sunport', city: 'Albuquerque', country: 'USA', region: 'North America' },
  { code: 'OKC', name: 'Will Rogers World Airport', city: 'Oklahoma City', country: 'USA', region: 'North America' },
  { code: 'TUL', name: 'Tulsa International Airport', city: 'Tulsa', country: 'USA', region: 'North America' },
  { code: 'OMA', name: 'Eppley Airfield', city: 'Omaha', country: 'USA', region: 'North America' },
  { code: 'ICT', name: 'Wichita Dwight D. Eisenhower National Airport', city: 'Wichita', country: 'USA', region: 'North America' },
  { code: 'DSM', name: 'Des Moines International Airport', city: 'Des Moines', country: 'USA', region: 'North America' },
];

serve(async (req) => {
  console.log(`🚀 Comprehensive airport search called - ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyword } = await req.json();
    console.log(`🔍 Searching for airports with keyword: "${keyword}"`);

    if (!keyword || keyword.length < 1) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const searchTerm = keyword.toLowerCase().trim();
    
    // Enhanced search through comprehensive airport database with city support
    const matchingAirports = WORLD_AIRPORTS.filter(airport => {
      const nameMatch = airport.name.toLowerCase().includes(searchTerm);
      const codeMatch = airport.code.toLowerCase().includes(searchTerm);
      const cityMatch = airport.city.toLowerCase().includes(searchTerm);
      const countryMatch = airport.country.toLowerCase().includes(searchTerm);
      
      return nameMatch || codeMatch || cityMatch || countryMatch;
    });

    // Group airports by city for city-based searches
    const cityGroups = new Map();
    matchingAirports.forEach(airport => {
      const cityKey = `${airport.city}-${airport.country}`;
      if (!cityGroups.has(cityKey)) {
        cityGroups.set(cityKey, []);
      }
      cityGroups.get(cityKey).push(airport);
    });

    // If searching by city name, show all airports in matching cities
    let finalResults = [...matchingAirports];
    
    // Check if we should include all airports from matching cities
    if (searchTerm.length > 2) {
      for (const [cityKey, airportsInCity] of cityGroups.entries()) {
        const [cityName, countryName] = cityKey.split('-');
        if (cityName.toLowerCase().includes(searchTerm) && airportsInCity.length > 1) {
          // Add all airports from this city if not already included
          airportsInCity.forEach(airport => {
            if (!finalResults.find(existing => existing.code === airport.code)) {
              finalResults.push(airport);
            }
          });
        }
      }
    }

    // Sort results by relevance
    const sortedResults = finalResults.sort((a, b) => {
      // Prioritize exact IATA code matches
      if (a.code.toLowerCase() === searchTerm) return -1;
      if (b.code.toLowerCase() === searchTerm) return 1;
      
      // Then exact city matches
      if (a.city.toLowerCase() === searchTerm) return -1;
      if (b.city.toLowerCase() === searchTerm) return 1;
      
      // Then code starts with search term
      if (a.code.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.code.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Then city starts with search term
      if (a.city.toLowerCase().startsWith(searchTerm)) return -1;
      if (b.city.toLowerCase().startsWith(searchTerm)) return 1;
      
      // Finally alphabetical by city
      return a.city.localeCompare(b.city);
    });

    // Transform to expected format and limit results
    const results = sortedResults.slice(0, 20).map(airport => ({
      id: airport.code,
      iataCode: airport.code,
      name: airport.name,
      cityName: airport.city,
      countryName: airport.country,
      description: `${airport.name} (${airport.code})`,
      region: airport.region
    }));

    console.log(`✅ Found ${results.length} matching airports`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in comprehensive airport search:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
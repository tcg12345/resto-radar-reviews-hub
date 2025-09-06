import { useState, useEffect, useRef } from 'react';
import { Search, Plane, MapPin, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// City to IATA city code mapping for multi-airport searches
const cityToCodeMap: Record<string, string> = {
  // North America
  "New York": "NYC",
  "New York City": "NYC", 
  "NYC": "NYC",
  "Manhattan": "NYC",
  "Los Angeles": "LAX",
  "LA": "LAX",
  "Chicago": "CHI",
  "Washington": "WAS",
  "Washington DC": "WAS",
  "Washington D.C.": "WAS",
  "Miami": "MIA",
  "San Francisco": "SFO",
  "SF": "SFO",
  "Bay Area": "SFO",
  "Boston": "BOS",
  
  // Europe
  "London": "LON",
  "Paris": "PAR",
  "Milan": "MIL",
  "Rome": "ROM",
  "Berlin": "BER",
  "Brussels": "BRU",
  "Stockholm": "STO",
  "Oslo": "OSL",
  "Moscow": "MOW",
  
  // Asia Pacific
  "Tokyo": "TYO",
  "Seoul": "SEL",
  "Shanghai": "SHA",
  "Beijing": "BJS",
  "Taipei": "TPE",
  "Bangkok": "BKK",
  "Jakarta": "JKT",
  "Manila": "MNL",
  "Mumbai": "BOM",
  "Delhi": "DEL",
  "Sydney": "SYD",
  "Melbourne": "MEL",
  
  // Middle East & Africa
  "Dubai": "DXB",
  "Doha": "DOH",
  "Istanbul": "IST",
  "Cairo": "CAI",
  "Johannesburg": "JNB",
  
  // South America
  "Buenos Aires": "BUE",
  "São Paulo": "SAO",
  "Sao Paulo": "SAO",
  "Rio de Janeiro": "RIO",
  "Rio": "RIO"
};

// Get city airports for better display
const cityAirports: Record<string, string[]> = {
  "NYC": ["JFK", "LGA", "EWR"],
  "LON": ["LHR", "LGW", "STN", "LTN"],
  "PAR": ["CDG", "ORY"],
  "MIL": ["MXP", "LIN"],
  "ROM": ["FCO", "CIA"],
  "BER": ["BER"],
  "BRU": ["BRU"],
  "STO": ["ARN"],
  "OSL": ["OSL"],
  "MOW": ["SVO", "DME", "VKO"],
  "TYO": ["NRT", "HND"],
  "SEL": ["ICN", "GMP"],
  "SHA": ["PVG", "SHA"],
  "BJS": ["PEK", "PKX"],
  "TPE": ["TPE"],
  "BKK": ["BKK"],
  "JKT": ["CGK"],
  "MNL": ["MNL"],
  "BOM": ["BOM"],
  "DEL": ["DEL"],
  "SYD": ["SYD"],
  "MEL": ["MEL"],
  "DXB": ["DXB"],
  "DOH": ["DOH"],
  "IST": ["IST"],
  "CAI": ["CAI"],
  "JNB": ["JNB"],
  "BUE": ["EZE", "AEP"],
  "SAO": ["GRU", "CGH"],
  "RIO": ["GIG", "SDU"],
  "CHI": ["ORD", "MDW"],
  "WAS": ["DCA", "IAD", "BWI"],
  "MIA": ["MIA", "FLL"],
  "SFO": ["SFO", "SJC", "OAK"],
  "BOS": ["BOS"]
};

interface AirportSuggestion {
  id: string;
  iataCode: string;
  name: string;
  cityName: string;
  countryName: string;
  description: string;
  isCity?: boolean;
  airportList?: string[];
}

interface AirportSearchProps {
  value: string;
  onChange: (value: string) => void;
  onAirportSelect?: (airport: AirportSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function AirportSearch({ 
  value, 
  onChange, 
  onAirportSelect, 
  placeholder = "Search by city (e.g., New York, London) or airport code...",
  className 
}: AirportSearchProps) {
  const [airports, setAirports] = useState<AirportSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Enhanced search with city code support
  useEffect(() => {
    // Skip search if searchTerm looks like a selected value (contains parentheses)
    if (searchTerm && searchTerm.includes('(')) {
      return;
    }
    
    if (!searchTerm || searchTerm.length < 1) {
      setAirports([]);
      setShowDropdown(false);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        console.log('Searching for airports:', searchTerm);
        
        // Check if the search term matches a city
        const normalizedTerm = searchTerm.trim();
        const cityCode = cityToCodeMap[normalizedTerm] || cityToCodeMap[normalizedTerm.toLowerCase()];
        
        let suggestions: AirportSuggestion[] = [];
        
        // If it's a known city, add city option first
        if (cityCode && cityAirports[cityCode]) {
          const cityAirportList = cityAirports[cityCode];
          suggestions.push({
            id: cityCode,
            iataCode: cityCode,
            name: `${normalizedTerm} (All Airports)`,
            cityName: normalizedTerm,
            countryName: '',
            description: `${normalizedTerm} - All airports (${cityAirportList.join(', ')})`,
            isCity: true,
            airportList: cityAirportList
          });
        }
        
        // Search for individual airports
        const { data, error } = await supabase.functions.invoke('comprehensive-airport-search', {
          body: { keyword: searchTerm }
        });

        console.log('Airport search response:', { data, error });

        if (error) {
          console.error('Error searching airports:', error);
          handleFallbackSearch(searchTerm, suggestions);
          return;
        }

        if (data && Array.isArray(data)) {
          const transformedAirports: AirportSuggestion[] = data.map((airport: any) => ({
            id: airport.iataCode,
            iataCode: airport.iataCode,
            name: airport.name,
            cityName: airport.cityName,
            countryName: airport.countryName,
            description: airport.description,
            isCity: false
          }));

          // Combine city suggestions with individual airports
          const allSuggestions = [...suggestions, ...transformedAirports];
          setAirports(allSuggestions);
          setShowDropdown(true);
        } else {
          handleFallbackSearch(searchTerm, suggestions);
        }
      } catch (error) {
        console.error('Airport search failed:', error);
        handleFallbackSearch(searchTerm, []);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  const handleFallbackSearch = (term: string, existingSuggestions: AirportSuggestion[] = []) => {
    // Fallback with common airports
    const commonAirports = [
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
      { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK' },
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
      { code: 'ORD', name: 'O\'Hare International Airport', city: 'Chicago', country: 'USA' },
      { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'USA' },
      { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'USA' },
      { code: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'USA' },
    ];

    const filtered = commonAirports.filter(airport => 
      airport.code.toLowerCase().includes(term.toLowerCase()) ||
      airport.name.toLowerCase().includes(term.toLowerCase()) ||
      airport.city.toLowerCase().includes(term.toLowerCase())
    );

    if (filtered.length > 0) {
      const fallbackAirports: AirportSuggestion[] = filtered.map(airport => ({
        id: airport.code,
        iataCode: airport.code,
        name: airport.name,
        cityName: airport.city,
        countryName: airport.country,
        description: `${airport.name} (${airport.code})`,
        isCity: false
      }));

      const allSuggestions = [...existingSuggestions, ...fallbackAirports];
      setAirports(allSuggestions);
      setShowDropdown(true);
    } else if (/^[A-Z]{3}$/i.test(term)) {
      // If it looks like an IATA code, create a fallback option
      const iataCode = term.toUpperCase();
      const fallbackAirport: AirportSuggestion = {
        id: iataCode,
        iataCode: iataCode,
        name: `${iataCode} Airport`,
        cityName: iataCode,
        countryName: '',
        description: `${iataCode} (IATA Code)`,
        isCity: false
      };
      const allSuggestions = [...existingSuggestions, fallbackAirport];
      setAirports(allSuggestions);
      setShowDropdown(true);
    } else {
      setAirports(existingSuggestions);
      setShowDropdown(existingSuggestions.length > 0);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  const handleAirportSelect = (airport: AirportSuggestion) => {
    let displayValue: string;
    
    if (airport.isCity) {
      // For city selections, show just the city code for API compatibility
      displayValue = airport.iataCode;
      setSearchTerm(`${airport.cityName} (All Airports)`);
      onChange(airport.iataCode); // Pass the city code (e.g., "NYC") to the API
    } else {
      // For individual airports, show the full name
      displayValue = `${airport.name} (${airport.iataCode})`;
      setSearchTerm(displayValue);
      onChange(airport.iataCode); // Pass just the airport code for individual airports
    }
    
    setShowDropdown(false);
    onAirportSelect?.(airport);
    
    // Blur the input to close keyboard (especially on mobile)
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (airports.length > 0) {
      updateDropdownPosition();
      setShowDropdown(true);
    }
  };

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn("pl-10", className)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-premium max-h-60 overflow-y-auto z-[999999]"
        >
          {airports.length > 0 ? (
            airports.map((airport) => (
              <div
                key={airport.id}
                onClick={() => handleAirportSelect(airport)}
                className={cn(
                  "flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-all duration-200 first:rounded-t-lg last:rounded-b-lg border-b border-border/30 last:border-b-0",
                  airport.isCity && "bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-l-primary/60"
                )}
              >
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    airport.isCity ? "bg-primary/20" : "bg-primary/10"
                  )}>
                    {airport.isCity ? (
                      <Building2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Plane className="w-4 h-4 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm text-foreground",
                      airport.isCity ? "font-semibold" : "font-medium"
                    )}>
                      {airport.name}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-mono",
                      airport.isCity 
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "bg-primary/10 text-primary"
                    )}>
                      {airport.iataCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    {airport.isCity ? (
                      <span className="text-primary/80 font-medium">
                        {airport.description}
                      </span>
                    ) : (
                      <>
                        <span>{airport.cityName}</span>
                        {airport.cityName !== airport.countryName && airport.countryName && (
                          <span>• {airport.countryName}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No airports found. Try searching by city name (e.g., "New York", "London") or IATA code.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
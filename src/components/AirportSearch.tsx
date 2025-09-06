import { useState, useEffect, useRef } from 'react';
import { Search, Plane, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface AirportSuggestion {
  id: string;
  iataCode: string;
  name: string;
  cityName: string;
  countryName: string;
  description: string;
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
  placeholder = "Search airports or enter IATA code...",
  className 
}: AirportSearchProps) {
  const [airports, setAirports] = useState<AirportSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
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

  // Search for airports using comprehensive database
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 1) {
      setAirports([]);
      setShowDropdown(false);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        console.log('Searching for airports:', searchTerm);
        
        const { data, error } = await supabase.functions.invoke('comprehensive-airport-search', {
          body: { keyword: searchTerm }
        });

        console.log('Airport search response:', { data, error });

        if (error) {
          console.error('Error searching airports:', error);
          handleFallbackSearch(searchTerm);
          return;
        }

        if (data && Array.isArray(data)) {
          const transformedAirports: AirportSuggestion[] = data.map((airport: any) => ({
            id: airport.iataCode,
            iataCode: airport.iataCode,
            name: airport.name,
            cityName: airport.cityName,
            countryName: airport.countryName,
            description: airport.description
          }));

          setAirports(transformedAirports);
          setShowDropdown(true);
        } else {
          handleFallbackSearch(searchTerm);
        }
      } catch (error) {
        console.error('Airport search failed:', error);
        handleFallbackSearch(searchTerm);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(searchTimer);
  }, [searchTerm]);

  const handleFallbackSearch = (term: string) => {
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
        description: `${airport.name} (${airport.code})`
      }));

      setAirports(fallbackAirports);
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
        description: `${iataCode} (IATA Code)`
      };
      setAirports([fallbackAirport]);
      setShowDropdown(true);
    } else {
      setAirports([]);
      setShowDropdown(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
  };

  const handleAirportSelect = (airport: AirportSuggestion) => {
    const displayValue = `${airport.name} (${airport.iataCode})`;
    setSearchTerm(displayValue);
    onChange(displayValue);
    setShowDropdown(false);
    onAirportSelect?.(airport);
  };

  const handleInputFocus = () => {
    if (airports.length > 0) {
      setShowDropdown(true);
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
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-2xl max-h-60 overflow-y-auto z-[10000]"
          style={{ 
            backgroundColor: 'var(--background)', 
            borderColor: 'var(--border)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
          {airports.length > 0 ? (
            airports.map((airport) => (
              <div
                key={airport.id}
                onClick={() => handleAirportSelect(airport)}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors first:rounded-t-md last:rounded-b-md"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plane className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{airport.name}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                      {airport.iataCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{airport.cityName}</span>
                    {airport.cityName !== airport.countryName && airport.countryName && (
                      <span>• {airport.countryName}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-sm text-muted-foreground text-center">
              No airports found. Try searching by city name or IATA code.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
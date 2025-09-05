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
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setAirports([]);
      setShowResults(false);
      return;
    }

    const searchTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('amadeus-enhanced-flight-api', {
          body: {
            endpoint: 'searchLocations',
            keyword: searchQuery
          }
        });

        if (error) {
          console.error('Error searching airports:', error);
          setAirports([]);
          return;
        }

        // The enhanced API returns data in a different format
        const locations = data || [];
        const transformedAirports: AirportSuggestion[] = locations.map((location: any) => ({
          id: location.iataCode || location.id || searchQuery.toUpperCase(),
          iataCode: location.iataCode || location.id || searchQuery.toUpperCase(),
          name: location.name,
          cityName: location.address?.cityName || location.cityName || location.name,
          countryName: location.address?.countryName || location.countryName || '',
          description: `${location.name} (${location.iataCode || location.id || searchQuery.toUpperCase()})`
        }));

        setAirports(transformedAirports);
        setShowResults(true);
      } catch (error) {
        console.error('Airport search failed:', error);
        setAirports([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue);
    
    // If user types exactly 3 capital letters, treat as IATA code
    if (/^[A-Z]{3}$/.test(newValue)) {
      const iataAirport: AirportSuggestion = {
        id: newValue,
        iataCode: newValue,
        name: `${newValue} Airport`,
        cityName: newValue,
        countryName: '',
        description: `${newValue} (IATA Code)`
      };
      setAirports([iataAirport]);
      setShowResults(true);
    }
  };

  const handleAirportSelect = (airport: AirportSuggestion) => {
    const displayValue = `${airport.name} (${airport.iataCode})`;
    setSearchQuery(displayValue);
    onChange(displayValue);
    setShowResults(false);
    onAirportSelect?.(airport);
  };

  const handleInputFocus = () => {
    if (airports.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={cn("pl-10", className)}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {showResults && airports.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-background border border-border rounded-md shadow-xl max-h-60 overflow-y-auto backdrop-blur-sm"
             style={{ backgroundColor: 'hsl(var(--background))' }}>
          {airports.map((airport) => (
            <div
              key={airport.id}
              onClick={() => handleAirportSelect(airport)}
              className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plane className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{airport.name}</span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                    {airport.iataCode}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{airport.cityName}</span>
                  {airport.cityName !== airport.countryName && (
                    <span>• {airport.countryName}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchQuery.length >= 2 && airports.length === 0 && !isLoading && (
        <div className="absolute z-[9999] w-full mt-1 bg-background border border-border rounded-md shadow-xl p-3"
             style={{ backgroundColor: 'hsl(var(--background))' }}>
          <div className="text-sm text-muted-foreground text-center">
            No airports found. Try searching by city name or IATA code.
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Loader2, Plane } from 'lucide-react';
import { useAmadeusApi, type AmadeusCity } from '@/hooks/useAmadeusApi';
import { cn } from '@/lib/utils';

interface AmadeusCitySearchProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (city: AmadeusCity) => void;
  placeholder?: string;
  className?: string;
}

export function AmadeusCitySearch({ 
  value, 
  onChange, 
  onCitySelect, 
  placeholder = "Search cities worldwide...",
  className 
}: AmadeusCitySearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [cities, setCities] = useState<AmadeusCity[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { searchCities } = useAmadeusApi();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length >= 2) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchCities(searchQuery);
          setCities(results);
          setShowResults(true);
        } catch (error) {
          console.error('Error searching cities:', error);
          setCities([]);
        } finally {
          setIsSearching(false);
        }
      }, 500);
    } else {
      setCities([]);
      setShowResults(false);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchCities]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchQuery(newValue);
  };

  const handleCitySelect = (city: AmadeusCity) => {
    const cityName = `${city.name}, ${city.address.countryName}`;
    onChange(cityName);
    setShowResults(false);
    setSearchQuery('');
    onCitySelect?.(city);
  };

  const getDisplayName = (city: AmadeusCity) => {
    const parts = [city.name];
    if (city.address.stateCode) {
      parts.push(city.address.stateCode);
    }
    parts.push(city.address.countryName);
    return parts.join(', ');
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isSearching && searchQuery.length >= 2 && (
          <Plane className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-amber-500" />
        )}
      </div>

      {showResults && cities.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border">
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto">
              {cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0 flex items-center gap-3"
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">
                      {city.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {city.address.stateCode && `${city.address.stateCode}, `}
                      {city.address.countryName}
                      {city.iataCode && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-mono">
                          {city.iataCode}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showResults && searchQuery.length >= 2 && cities.length === 0 && !isSearching && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border">
          <CardContent className="p-4">
            <div className="text-center text-sm text-muted-foreground">
              No cities found for "{searchQuery}"
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
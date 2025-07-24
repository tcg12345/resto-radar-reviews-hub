import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAmadeusApi, AmadeusCity } from '@/hooks/useAmadeusApi';

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
  placeholder = "Enter city or airport name",
  className 
}: AmadeusCitySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<AmadeusCity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { searchCities } = useAmadeusApi();
  const containerRef = useRef<HTMLDivElement>(null);

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
    const searchForCities = async () => {
      if (searchQuery.length < 2) {
        setCities([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchCities(searchQuery);
        setCities(results);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching cities:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchForCities, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchCities]);

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleCitySelect = (city: AmadeusCity) => {
    const displayValue = city.iataCode ? `${city.name} (${city.iataCode})` : city.name;
    onChange(displayValue);
    setSearchQuery('');
    setShowResults(false);
    onCitySelect?.(city);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && cities.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {cities.map((city) => (
            <div
              key={city.id}
              onClick={() => handleCitySelect(city)}
              className="px-4 py-2 hover:bg-accent cursor-pointer border-b border-border last:border-b-0"
            >
              <div className="font-medium">
                {city.name} {city.iataCode && `(${city.iataCode})`}
              </div>
              <div className="text-sm text-muted-foreground">
                {city.address.countryName}
                {city.address.stateCode && `, ${city.address.stateCode}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && cities.length === 0 && !isLoading && searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
          <div className="px-4 py-2 text-muted-foreground">
            No cities or airports found
          </div>
        </div>
      )}
    </div>
  );
}
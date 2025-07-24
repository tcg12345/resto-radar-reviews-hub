import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface CitySearchProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (location: LocationSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function AmadeusCitySearch({ 
  value, 
  onChange, 
  onCitySelect, 
  placeholder = "Enter city name",
  className 
}: CitySearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
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
    const searchForLocations = async () => {
      if (searchQuery.length < 2) {
        setLocations([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('location-suggestions', {
          body: { input: searchQuery, limit: 10 }
        });

        if (error) throw error;
        
        setLocations(data.suggestions || []);
        setShowResults(true);
      } catch (error) {
        console.error('Error searching locations:', error);
        setLocations([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchForLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);
    onChange(newValue);
  };

  const handleLocationSelect = (location: LocationSuggestion) => {
    onChange(location.description);
    setSearchQuery('');
    setShowResults(false);
    onCitySelect?.(location);
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

      {showResults && locations.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {locations.map((location) => (
            <div
              key={location.place_id}
              onClick={() => handleLocationSelect(location)}
              className="px-4 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer border-b border-border last:border-b-0"
            >
              <div className="font-medium text-foreground">
                {location.main_text}
              </div>
              <div className="text-sm text-muted-foreground">
                {location.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && locations.length === 0 && !isLoading && searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
          <div className="px-4 py-2 text-muted-foreground">
            No cities found
          </div>
        </div>
      )}
    </div>
  );
}
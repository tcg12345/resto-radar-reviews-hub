import { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CitySuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCitySelect?: (city: CitySuggestion) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  onCitySelect,
  placeholder = "Enter a city",
  className
}: CityAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState(value);
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setCities([]);
      setShowResults(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('location-suggestions', {
          body: { input: searchQuery, limit: 8 }
        });

        if (error) throw error;

        if (data?.success && data?.suggestions) {
          setCities(data.suggestions);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
        setCities([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onChange(value);
  };

  const handleCitySelect = (city: CitySuggestion) => {
    setSearchQuery(city.mainText);
    onChange(city.mainText);
    setCities([]);
    setShowResults(false);
    onCitySelect?.(city);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
          onFocus={() => {
            if (cities.length > 0) {
              setShowResults(true);
            }
          }}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {showResults && cities.length > 0 && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto bg-background border shadow-lg"
        >
          <div className="p-1">
            {cities.map((city) => (
              <div
                key={city.id}
                onClick={() => handleCitySelect(city)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-accent cursor-pointer transition-colors"
              >
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {city.mainText}
                  </div>
                  {city.secondaryText && (
                    <div className="text-xs text-muted-foreground truncate">
                      {city.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showResults && searchQuery.trim().length >= 2 && cities.length === 0 && !isLoading && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border shadow-lg"
        >
          <div className="p-4 text-center text-sm text-muted-foreground">
            No cities found
          </div>
        </Card>
      )}
    </div>
  );
}
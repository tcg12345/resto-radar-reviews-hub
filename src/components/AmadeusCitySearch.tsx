import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface LocationSuggestion {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
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
      if (value.length < 2) {
        setLocations([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('location-suggestions', {
          body: { query: value }
        });

        if (error) throw error;

        if (data && data.suggestions) {
          setLocations(data.suggestions);
          setShowResults(true);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchForLocations, 300);
    return () => clearTimeout(debounceTimer);
  }, [value]);

  const handleLocationSelect = (location: LocationSuggestion) => {
    onChange(location.description);
    setShowResults(false);
    if (onCitySelect) {
      onCitySelect(location);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className={`pl-12 pr-12 font-medium placeholder:text-muted-foreground/60 ${className}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-primary" />
        )}
      </div>

      {showResults && locations.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2">
          <div className="bg-card/95 backdrop-blur-xl border border-border/30 rounded-2xl shadow-premium-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto scrollbar-hide">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full px-4 py-4 text-left hover:bg-primary/10 transition-all duration-200 border-b border-border/20 last:border-b-0 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                        {location.mainText}
                      </div>
                      <div className="text-sm text-muted-foreground/80 font-medium truncate">
                        {location.secondaryText}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showResults && locations.length === 0 && !isLoading && value.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2">
          <div className="bg-card/95 backdrop-blur-xl border border-border/30 rounded-2xl shadow-premium-xl overflow-hidden">
            <div className="px-4 py-4 text-center text-muted-foreground/80 font-medium">
              No cities found
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { Filter, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CityFilterDialog } from './CityFilterDialog';

interface RecommendationFiltersProps {
  availableCities: string[];
  selectedCities: string[];
  selectedPriceRanges: number[];
  onCityChange: (cities: string[]) => void;
  onPriceRangeChange: (priceRanges: number[]) => void;
  isMobile: boolean;
}

const priceRangeLabels = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$'
};

export function RecommendationFilters({
  availableCities,
  selectedCities,
  selectedPriceRanges,
  onCityChange,
  onPriceRangeChange,
  isMobile
}: RecommendationFiltersProps) {
  const [showCityDialog, setShowCityDialog] = useState(false);

  const handleClearFilters = () => {
    onCityChange([]);
    onPriceRangeChange([]);
  };

  const handlePriceRangeToggle = (priceRange: number) => {
    if (selectedPriceRanges.includes(priceRange)) {
      onPriceRangeChange(selectedPriceRanges.filter(p => p !== priceRange));
    } else {
      onPriceRangeChange([...selectedPriceRanges, priceRange]);
    }
  };

  const totalFilters = selectedCities.length + selectedPriceRanges.length;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* City Filter */}
      <div className="relative">
        {isMobile ? (
          <Button
            variant="outline"
            onClick={() => setShowCityDialog(true)}
            className="flex items-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            <span>
              {selectedCities.length === 0
                ? 'City'
                : selectedCities.length === 1
                ? selectedCities[0]
                : `${selectedCities.length} cities`}
            </span>
            <ChevronDown className="h-4 w-4" />
            {selectedCities.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {selectedCities.length}
              </Badge>
            )}
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {selectedCities.length === 0
                    ? 'City'
                    : selectedCities.length === 1
                    ? selectedCities[0]
                    : `${selectedCities.length} cities`}
                </span>
                <ChevronDown className="h-4 w-4" />
                {selectedCities.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {selectedCities.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <div className="p-4">
                <h4 className="font-medium mb-3">Select Cities</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableCities.map((city) => (
                    <label key={city} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCities.includes(city)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onCityChange([...selectedCities, city]);
                          } else {
                            onCityChange(selectedCities.filter(c => c !== city));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{city}</span>
                    </label>
                  ))}
                </div>
                {selectedCities.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCityChange([])}
                    className="w-full mt-3"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Price Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span>$</span>
            <span>
              {selectedPriceRanges.length === 0
                ? 'Price'
                : selectedPriceRanges.length === 1
                ? priceRangeLabels[selectedPriceRanges[0] as keyof typeof priceRangeLabels]
                : `${selectedPriceRanges.length} ranges`}
            </span>
            <ChevronDown className="h-4 w-4" />
            {selectedPriceRanges.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {selectedPriceRanges.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-0" align="start">
          <div className="p-4">
            <h4 className="font-medium mb-3">Price Range</h4>
            <div className="space-y-2">
              {Object.entries(priceRangeLabels).map(([value, label]) => (
                <label key={value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPriceRanges.includes(Number(value))}
                    onChange={() => handlePriceRangeToggle(Number(value))}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
            {selectedPriceRanges.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPriceRangeChange([])}
                className="w-full mt-3"
              >
                Clear All
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear All Filters */}
      {totalFilters > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground">
          Clear All ({totalFilters})
        </Button>
      )}

      {/* Mobile City Dialog */}
      {isMobile && (
        <CityFilterDialog
          open={showCityDialog}
          onOpenChange={setShowCityDialog}
          availableCities={availableCities}
          selectedCities={selectedCities}
          onCityChange={onCityChange}
        />
      )}
    </div>
  );
}
import { useState } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface CityFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableCities: string[];
  selectedCities: string[];
  onCityChange: (cities: string[]) => void;
}

export function CityFilterDialog({
  open,
  onOpenChange,
  availableCities,
  selectedCities,
  onCityChange
}: CityFilterDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCities = availableCities.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      onCityChange(selectedCities.filter(c => c !== city));
    } else {
      onCityChange([...selectedCities, city]);
    }
  };

  const handleClearAll = () => {
    onCityChange([]);
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-h-[800px] w-[95vw] max-w-none p-0 gap-0 rounded-t-lg rounded-b-none fixed bottom-0 left-1/2 -translate-x-1/2 translate-y-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">City</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search City"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>

          {/* Current Location Option */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="text-primary font-medium">Current Location</span>
              <div className="ml-auto">
                <Checkbox 
                  checked={false}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Cities List */}
          <div className="flex-1 overflow-y-auto">
            {filteredCities.map((city) => (
              <div key={city} className="flex items-center justify-between p-4 border-b border-border/50">
                <span className="text-sm">{city}</span>
                <Checkbox
                  checked={selectedCities.includes(city)}
                  onCheckedChange={() => handleCityToggle(city)}
                />
              </div>
            ))}
          </div>

          {/* Footer Buttons */}
          <div className="flex p-4 gap-3 border-t bg-background">
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex-1"
              disabled={selectedCities.length === 0}
            >
              Clear All
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
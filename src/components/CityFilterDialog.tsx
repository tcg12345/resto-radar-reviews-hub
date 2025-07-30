import { useState, useEffect } from 'react';
import { Search, MapPin } from 'lucide-react';
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Prevent background scrolling when dialog is open
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.classList.add('overflow-hidden');
      document.body.classList.add('overflow-hidden');

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.documentElement.classList.remove('overflow-hidden');
        document.body.classList.remove('overflow-hidden');
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  // Touch handlers for swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isDownSwipe = distance < -50; // Swipe down at least 50px
    
    if (isDownSwipe) {
      onOpenChange(false);
    }
  };

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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-[9998]"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Bottom Sheet */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t rounded-t-xl animate-in slide-in-from-bottom duration-300 h-[80vh] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col h-full">
          {/* Drag Handle */}
          <div className="flex justify-center py-2 cursor-pointer">
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full"></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 bg-background">
            <h2 className="text-lg font-semibold">City</h2>
          </div>

          {/* Search */}
          <div className="px-4 pb-4 bg-background">
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
          <div className="px-4 pb-4 border-b bg-background">
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
          <div className="flex-1 overflow-y-auto bg-background" style={{ WebkitOverflowScrolling: 'touch' }}>
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
      </div>
    </>
  );
}
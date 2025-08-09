import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp, Utensils, DollarSign, X } from 'lucide-react';
import { MichelinStarIcon } from '@/components/MichelinStarIcon';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Drawer, DrawerContent, DrawerFooter, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/useIsMobile';

interface RatedRestaurantsFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Filter values
  filterCuisines: string[];
  filterPrices: string[];
  filterMichelins: string[];
  ratingRange: [number, number];
  sortBy: 'latest' | 'oldest' | 'rating-high' | 'rating-low' | 'name-az' | 'name-za' | 'price-low' | 'price-high' | 'michelin-high' | 'michelin-low';

  // Filter data
  cuisineCounts: {
    cuisine: string;
    count: number;
  }[];
  priceCounts: {
    price: string;
    count: number;
  }[];
  michelinCounts: {
    michelin: string;
    count: number;
  }[];

  // Filter handlers
  onCuisineToggle: (cuisine: string) => void;
  onPriceToggle: (price: string) => void;
  onMichelinToggle: (michelin: string) => void;
  onRatingRangeChange: (range: [number, number]) => void;
  onSortByChange: (sortBy: 'latest' | 'oldest' | 'rating-high' | 'rating-low' | 'name-az' | 'name-za' | 'price-low' | 'price-high' | 'michelin-high' | 'michelin-low') => void;
  onClearFilters: () => void;
}

export function RatedRestaurantsFilterDialog({
  open,
  onOpenChange,
  filterCuisines,
  filterPrices,
  filterMichelins,
  ratingRange,
  sortBy,
  cuisineCounts,
  priceCounts,
  michelinCounts,
  onCuisineToggle,
  onPriceToggle,
  onMichelinToggle,
  onRatingRangeChange,
  onSortByChange,
  onClearFilters
}: RatedRestaurantsFilterDialogProps) {
  const [tempRatingRange, setTempRatingRange] = useState<[number, number]>(ratingRange);
  const [cuisineOpen, setCuisineOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [michelinOpen, setMichelinOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleApply = () => {
    onRatingRangeChange(tempRatingRange);
    onOpenChange(false);
  };

  const handleClearAll = () => {
    onClearFilters();
    setTempRatingRange([0, 10]);
  };

  const getPriceDisplay = (price: string) => {
    return price === '1' ? '$' : price === '2' ? '$$' : price === '3' ? '$$$' : '$$$$';
  };

  const hasActiveFilters =
    filterCuisines.length > 0 ||
    filterPrices.length > 0 ||
    filterMichelins.length > 0 ||
    ratingRange[0] > 0 ||
    ratingRange[1] < 10;

  // Content
  const FilterContent = (
    <>
      {/* Sort Options */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Sort By</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={sortBy === 'latest' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('latest')} className="justify-start">
            Latest
          </Button>
          <Button variant={sortBy === 'oldest' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('oldest')} className="justify-start">
            Oldest
          </Button>
          <Button variant={sortBy === 'rating-high' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('rating-high')} className="justify-start">
            Rating ↓
          </Button>
          <Button variant={sortBy === 'rating-low' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('rating-low')} className="justify-start">
            Rating ↑
          </Button>
          <Button variant={sortBy === 'name-az' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('name-az')} className="justify-start">
            Name A-Z
          </Button>
          <Button variant={sortBy === 'name-za' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('name-za')} className="justify-start">
            Name Z-A
          </Button>
          <Button variant={sortBy === 'price-low' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('price-low')} className="justify-start">
            Price ↑
          </Button>
          <Button variant={sortBy === 'price-high' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('price-high')} className="justify-start">
            Price ↓
          </Button>
          <Button variant={sortBy === 'michelin-high' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('michelin-high')} className="justify-start">
            Michelin ↓
          </Button>
          <Button variant={sortBy === 'michelin-low' ? 'default' : 'outline'} size="sm" onClick={() => onSortByChange('michelin-low')} className="justify-start">
            Michelin ↑
          </Button>
        </div>
      </div>

      {/* Rating Range Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Rating Range</Label>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground w-8">{tempRatingRange[0]}</span>
          <Slider
            value={tempRatingRange}
            onValueChange={(value) => setTempRatingRange(value as [number, number])}
            max={10}
            min={0}
            step={0.1}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-8">{tempRatingRange[1]}</span>
        </div>
      </div>

      {/* Cuisine Filter */}
      <Collapsible open={cuisineOpen} onOpenChange={setCuisineOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-4 px-0 border-b border-border cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Utensils className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium">Cuisine</span>
              {filterCuisines.length > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  {filterCuisines.length}
                </span>
              )}
            </div>
            {cuisineOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="-mt-1">
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {cuisineCounts.map(({ cuisine, count }) => (
              <div key={cuisine} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`cuisine-${cuisine}`}
                    checked={filterCuisines.includes(cuisine)}
                    onCheckedChange={() => onCuisineToggle(cuisine)}
                  />
                  <label htmlFor={`cuisine-${cuisine}`} className="text-sm cursor-pointer">
                    {cuisine}
                  </label>
                </div>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Filter */}
      <Collapsible open={priceOpen} onOpenChange={setPriceOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between py-4 px-0 border-b border-border cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Price Range</span>
              {filterPrices.length > 0 && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  {filterPrices.length}
                </span>
              )}
            </div>
            {priceOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="-mt-1">
          <div className="p-4 space-y-3">
            {priceCounts.map(({ price, count }) => (
              <div key={price} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`price-${price}`}
                    checked={filterPrices.includes(price)}
                    onCheckedChange={() => onPriceToggle(price)}
                  />
                  <label htmlFor={`price-${price}`} className="text-sm cursor-pointer">
                    {getPriceDisplay(price)}
                  </label>
                </div>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Michelin Filter */}
      {michelinCounts.length > 0 && (
        <Collapsible open={michelinOpen} onOpenChange={setMichelinOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between py-4 px-0 border-b border-border cursor-pointer hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <MichelinStarIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Michelin Stars</span>
                {filterMichelins.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    {filterMichelins.length}
                  </span>
                )}
              </div>
              {michelinOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="-mt-1">
            <div className="p-4 space-y-3">
              {michelinCounts.map(({ michelin, count }) => (
                <div key={michelin} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`michelin-${michelin}`}
                      checked={filterMichelins.includes(michelin)}
                      onCheckedChange={() => onMichelinToggle(michelin)}
                    />
                    <label htmlFor={`michelin-${michelin}`} className="text-sm cursor-pointer">
                      {`${michelin} Michelin Star${michelin === '1' ? '' : 's'}`}
                    </label>
                  </div>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </>
  );

  const FooterButtons = (
    <div className="flex gap-3">
      <Button
        variant="outline"
        onClick={handleClearAll}
        className="flex-1"
        disabled={!hasActiveFilters}
      >
        Clear All
      </Button>
      <Button onClick={handleApply} className="flex-1 bg-primary hover:bg-primary/90">
        Apply
      </Button>
    </div>
  );

  // Mobile uses Drawer (bottom-sheet), desktop uses Dialog
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-3xl border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-0">
          <div className="mx-auto w-full max-w-md">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-gradient-to-b from-background/95 via-background to-background/80 px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <DrawerTitle className="text-base font-semibold">Filters & Sort</DrawerTitle>
                  <DrawerDescription className="text-xs text-muted-foreground">Refine your rated places</DrawerDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="space-y-6">{FilterContent}</div>
            </div>

            <DrawerFooter>{FooterButtons}</DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <DialogTitle>Filters & Sort</DialogTitle>
          <DialogDescription>Refine your rated places</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">{FilterContent}</div>
        <div className="pt-4">{FooterButtons}</div>
      </DialogContent>
    </Dialog>
  );
}

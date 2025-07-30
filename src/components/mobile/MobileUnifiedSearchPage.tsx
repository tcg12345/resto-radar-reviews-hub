import React, { useState, useEffect } from 'react';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DiscoverResultsGrid } from '@/components/DiscoverResultsGrid';
import { GlobalSearchMap } from '@/components/GlobalSearchMap';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchFilters {
  cuisine: string;
  priceRange: string;
  rating: number[];
  location: string;
}

const EXAMPLE_QUERIES = [
  "Best pizza in New York",
  "Michelin starred sushi",
  "Rooftop bars with views",
  "Vegan restaurants",
  "Late night eats",
  "Romantic dinner spots"
];

const POPULAR_LOCATIONS = [
  "New York, NY",
  "London, UK", 
  "Tokyo, Japan",
  "Paris, France",
  "San Francisco, CA",
  "Singapore"
];

const CUISINES = [
  "Italian", "Japanese", "French", "Chinese", "Mexican", "Indian", 
  "Thai", "Mediterranean", "American", "Korean", "Vietnamese", "Spanish"
];

export function MobileUnifiedSearchPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'map'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentExample, setCurrentExample] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    cuisine: 'all',
    priceRange: 'all',
    rating: [0],
    location: ''
  });

  // Rotate example queries
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExample((prev) => (prev + 1) % EXAMPLE_QUERIES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const { data, error } = await supabase.functions.invoke('google-places-search', {
            body: { 
              query: searchQuery,
              location: locationQuery || 'worldwide'
            }
          });

          if (!error && data?.results) {
            setSuggestions(data.results.slice(0, 5)); // Show top 5 suggestions
            setShowSuggestions(true);
          }
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300); // 300ms debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, locationQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false); // Hide suggestions when doing actual search
    try {
      const { data, error } = await supabase.functions.invoke('restaurant-search', {
        body: { 
          query: searchQuery,
          location: locationQuery || filters.location,
          filters: {
            cuisine: filters.cuisine,
            priceRange: filters.priceRange,
            minRating: filters.rating[0]
          }
        }
      });

      if (error) {
        console.error('Search error:', error);
        toast('Search failed. Please try again.');
        return;
      }

      setResults(data?.restaurants || []);
      
      if (data?.restaurants?.length === 0) {
        toast('No restaurants found. Try adjusting your search criteria.');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    // Auto-search when clicking a suggestion
    setTimeout(() => handleSearch(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      cuisine: 'all',
      priceRange: 'all',
      rating: [0],
      location: ''
    });
  };

  const hasActiveFilters = filters.cuisine && filters.cuisine !== 'all' || filters.priceRange && filters.priceRange !== 'all' || filters.rating[0] > 0 || filters.location;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Search Header */}
      <div className="p-4 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={EXAMPLE_QUERIES[currentExample]}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pl-10 pr-4 h-11 text-base"
          />
        </div>

        {/* Location and Filters Row */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Location"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10 pr-4 h-10 text-sm"
            />
          </div>
          
          <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3 relative">
                <Filter className="h-4 w-4" />
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Cuisine</Label>
                  <Select value={filters.cuisine} onValueChange={(value) => setFilters(prev => ({ ...prev, cuisine: value }))}>
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Any cuisine" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any cuisine</SelectItem>
                      {CUISINES.map(cuisine => (
                        <SelectItem key={cuisine} value={cuisine}>{cuisine}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Price Range</Label>
                  <Select value={filters.priceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}>
                    <SelectTrigger className="h-10 mt-1">
                      <SelectValue placeholder="Any price" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any price</SelectItem>
                      <SelectItem value="$">$ - Budget</SelectItem>
                      <SelectItem value="$$">$$ - Moderate</SelectItem>
                      <SelectItem value="$$$">$$$ - Expensive</SelectItem>
                      <SelectItem value="$$$$">$$$$ - Very Expensive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Minimum Rating: {filters.rating[0]}/5</Label>
                  <Slider
                    value={filters.rating}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, rating: value }))}
                    max={5}
                    min={0}
                    step={0.5}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium">Location</Label>
                  <Input
                    placeholder="Specific location"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="h-10 mt-1"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={clearFilters} className="flex-1">
                  Clear All
                </Button>
                <Button onClick={() => setIsFilterOpen(false)} className="flex-1">
                  Apply Filters
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="w-full h-11"
        >
          {isLoading ? 'Searching...' : 'Search Restaurants'}
        </Button>

        {/* Quick Examples */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Try searching for:</p>
          <div className="flex flex-wrap gap-1">
            {EXAMPLE_QUERIES.slice(0, 3).map((query, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/10"
                onClick={() => setSearchQuery(query)}
              >
                {query}
              </Badge>
            ))}
          </div>
        </div>

        {/* Popular Locations */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Popular locations:</p>
          <div className="flex flex-wrap gap-1">
            {POPULAR_LOCATIONS.slice(0, 4).map((location, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-muted/50"
                onClick={() => setLocationQuery(location)}
              >
                {location}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 pb-2">
        <div className="flex bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === 'map'
                ? 'bg-background text-primary shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Map View
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'search' ? (
          <ScrollArea className="h-full px-4">
            <div className="pb-4">
              {/* Show suggestions as you type */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Suggestions</h3>
                    <Badge variant="secondary" className="text-xs">As you type</Badge>
                  </div>
                  <div className="grid gap-3">
                    {suggestions.map((suggestion, index) => (
                      <Card 
                        key={suggestion.place_id || index}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-1">{suggestion.name}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {suggestion.formatted_address || suggestion.vicinity}
                              </p>
                              <div className="flex items-center gap-2">
                                {suggestion.rating && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-yellow-500">★</span>
                                    <span className="text-sm font-medium">{suggestion.rating}</span>
                                  </div>
                                )}
                                {suggestion.price_level && (
                                  <span className="text-sm text-green-600">
                                    {'$'.repeat(suggestion.price_level)}
                                  </span>
                                )}
                                {suggestion.types && suggestion.types.includes('restaurant') && (
                                  <Badge variant="outline" className="text-xs">Restaurant</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Show actual search results */}
              {results.length > 0 && !showSuggestions ? (
                <DiscoverResultsGrid 
                  restaurants={results}
                  onToggleWishlist={() => {}}
                  existingRestaurants={[]}
                  searchQuery={searchQuery}
                  isLoading={isLoading}
                  hasSearched={!!searchQuery}
                />
              ) : !showSuggestions && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No results found. Try adjusting your search.' : 'Start by searching for restaurants above.'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full">
            <GlobalSearchMap 
              restaurants={results}
              onRestaurantClick={() => {}}
            />
          </div>
        )}
      </div>
    </div>
  );
}
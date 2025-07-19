import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, MapPin, Filter, Loader2 } from 'lucide-react';

interface SearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  locationQuery: string;
  setLocationQuery: (location: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  "Michelin starred restaurants in NYC",
  "Family-friendly pizza with outdoor seating",
  "Romantic French bistro for date night",
  "Vegetarian fine dining downtown",
  "Best sushi for business dinner",
  "Brunch spot with bottomless mimosas"
];

export function DiscoverSearchForm({
  searchQuery,
  setSearchQuery,
  locationQuery,
  setLocationQuery,
  onSearch,
  isLoading
}: SearchFormProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      onSearch();
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          AI-Powered Restaurant Discovery
        </CardTitle>
        <CardDescription className="text-base">
          Describe what you're looking for in natural language - we'll find the perfect restaurants for you
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Search Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              What are you looking for?
            </label>
            <Input
              placeholder="e.g., 'Romantic Italian restaurant for anniversary dinner'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className="text-base h-12 bg-background/50 border-muted-foreground/20 focus:border-primary"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Location (optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="City or neighborhood"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                className="pl-10 h-12 bg-background/50 border-muted-foreground/20 focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={onSearch} 
            disabled={isLoading || !searchQuery.trim()} 
            className="h-12 px-8 bg-primary hover:bg-primary/90 flex-1 lg:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Discover Restaurants
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-12 px-4"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Example Queries */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Try these examples:
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors px-3 py-1 text-xs"
                onClick={() => setSearchQuery(example)}
              >
                {example}
              </Badge>
            ))}
          </div>
        </div>

        {/* Quick Location Shortcuts */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Popular locations:
          </p>
          <div className="flex flex-wrap gap-2">
            {['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'San Francisco, CA', 'Miami, FL'].map((location) => (
              <Badge
                key={location}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors px-3 py-1 text-xs"
                onClick={() => setLocationQuery(location)}
              >
                {location}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
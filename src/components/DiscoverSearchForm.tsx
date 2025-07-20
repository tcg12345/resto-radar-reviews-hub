import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Sparkles, MapPin, Filter, Loader2 } from 'lucide-react';

export type SearchType = 'name' | 'cuisine' | 'description';

interface SearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  locationQuery: string;
  setLocationQuery: (location: string) => void;
  searchType: SearchType;
  setSearchType: (type: SearchType) => void;
  onSearch: () => void;
  isLoading: boolean;
}

const EXAMPLE_QUERIES = [
  // Fine Dining & Michelin
  "Michelin starred restaurants in NYC",
  "Two-star Michelin restaurant for special occasion",
  "Fine dining with tasting menu",
  "Award-winning chef restaurants",
  "Luxury dining with wine pairing",
  "Celebrity chef steakhouse",
  "High-end French cuisine",
  "Molecular gastronomy experience",
  "James Beard Award winners",
  "Farm-to-table fine dining",

  // Casual & Family
  "Family-friendly pizza with outdoor seating",
  "Kid-friendly restaurants with play area",
  "Casual dining with large portions",
  "Sports bar with big screens",
  "Dog-friendly patio dining",
  "All-you-can-eat buffet",
  "Quick casual healthy options",
  "Family restaurant with arcade",
  "Diner with classic comfort food",
  "Casual seafood shack",

  // Romantic & Date Night
  "Romantic French bistro for date night",
  "Intimate wine bar for couples",
  "Candlelit dinner restaurant",
  "Rooftop dining with city views",
  "Cozy fireplace restaurant",
  "Private dining rooms available",
  "Romantic Italian trattoria",
  "Wine cellar dining experience",
  "Sunset dinner with ocean views",
  "Quiet restaurant for conversation",

  // Cuisine Types - Asian
  "Best sushi for business dinner",
  "Authentic ramen shop",
  "Korean BBQ with tabletop grills",
  "Thai restaurant with spice levels",
  "Chinese dim sum brunch",
  "Vietnamese pho house",
  "Japanese izakaya experience",
  "Indian curry house",
  "Filipino comfort food",
  "Mongolian hot pot restaurant",

  // Cuisine Types - European
  "Authentic Italian trattoria",
  "German beer garden with pretzels",
  "Spanish tapas bar",
  "Greek restaurant with live music",
  "British pub with fish and chips",
  "French cafe with pastries",
  "Scandinavian Nordic cuisine",
  "Eastern European pierogi house",
  "Turkish Mediterranean grill",
  "Portuguese seafood restaurant",

  // Cuisine Types - American & More
  "Classic American steakhouse",
  "Southern BBQ joint",
  "Tex-Mex with margaritas",
  "New Orleans Cajun cuisine",
  "Chicago deep dish pizza",
  "California fresh cuisine",
  "Hawaiian plate lunch",
  "Soul food restaurant",
  "Native American cuisine",
  "Fusion food truck favorites",

  // Dietary Restrictions
  "Vegetarian fine dining downtown",
  "Vegan restaurant with creative dishes",
  "Gluten-free pasta restaurant",
  "Keto-friendly steakhouse",
  "Raw food cafe",
  "Organic farm-to-table",
  "Halal Mediterranean grill",
  "Kosher deli with pastrami",
  "Dairy-free ice cream shop",
  "Plant-based burger joint",

  // Breakfast & Brunch
  "Brunch spot with bottomless mimosas",
  "24-hour breakfast diner",
  "Pancake house with unique flavors",
  "Bagel shop with fresh lox",
  "French toast specialist",
  "Healthy smoothie bowl cafe",
  "Classic eggs benedict brunch",
  "Waffle house with toppings bar",
  "Breakfast burrito food truck",
  "Coffee shop with homemade pastries",

  // Atmosphere & Vibes
  "Cozy cafe with live music",
  "Industrial chic restaurant",
  "Bohemian wine bar",
  "Trendy gastropub",
  "Historic restaurant with character",
  "Modern minimalist dining",
  "Rustic farmhouse restaurant",
  "Speakeasy with craft cocktails",
  "Beach-themed seafood house",
  "Art gallery with dining",

  // Special Occasions
  "Birthday dinner restaurant",
  "Anniversary celebration venue",
  "Graduation party restaurant",
  "Wedding rehearsal dinner spot",
  "Holiday brunch restaurant",
  "Corporate event dining",
  "First date restaurant",
  "Proposal dinner location",
  "Family reunion restaurant",
  "Bachelor party steakhouse",

  // Drinks & Nightlife
  "Craft cocktail lounge",
  "Wine bar with cheese plates",
  "Brewery with food menu",
  "Sake bar with small plates",
  "Tequila bar with tacos",
  "Whiskey bar with cigars",
  "Champagne bar for celebrations",
  "Beer garden with bratwurst",
  "Rooftop bar with skyline views",
  "Dive bar with comfort food",

  // Time-Specific
  "Late night eats after midnight",
  "Early morning coffee and breakfast",
  "Lunch spot with quick service",
  "Happy hour with appetizer deals",
  "Sunday brunch with live jazz",
  "Weekday lunch specials",
  "Saturday night dinner reservations",
  "Afternoon tea service",
  "Pre-theater dinner",
  "Post-workout healthy meals",

  // Price Points
  "Cheap eats under $15",
  "Mid-range family restaurant",
  "Upscale dining experience",
  "All-you-can-eat value meal",
  "Student budget friendly",
  "Date night splurge restaurant",
  "Business lunch expense account",
  "Happy hour drink specials",
  "Prix fixe menu deals",
  "BYOB restaurant to save money",

  // Unique Experiences
  "Dinner theater restaurant",
  "Cooking class with meal",
  "Chef's table experience",
  "Wine tasting dinner",
  "Murder mystery dinner",
  "Hibachi grill with show",
  "Fondue restaurant for sharing",
  "Hot pot social dining",
  "Tableside guacamole preparation",
  "Interactive dining experience",

  // Seasonal & Weather
  "Outdoor patio summer dining",
  "Cozy fireplace winter restaurant",
  "Fall harvest menu restaurant",
  "Spring garden terrace dining",
  "Christmas dinner restaurant",
  "Valentine's Day romantic spot",
  "New Year's Eve celebration",
  "Summer seafood shack",
  "Autumn wine harvest dinner",
  "Holiday themed restaurant",

  // Health & Wellness
  "Organic locally sourced restaurant",
  "Low-calorie healthy options",
  "Superfood smoothie bar",
  "Paleo-friendly restaurant",
  "Mediterranean diet restaurant",
  "Anti-inflammatory menu options",
  "Juice bar with acai bowls",
  "Whole foods plant-based",
  "Clean eating restaurant",
  "Wellness-focused cafe"
];

export function DiscoverSearchForm({
  searchQuery,
  setSearchQuery,
  locationQuery,
  setLocationQuery,
  searchType,
  setSearchType,
  onSearch,
  isLoading
}: SearchFormProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  // Rotate example queries every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % Math.min(6, EXAMPLE_QUERIES.length));
    }, 5500);

    return () => clearInterval(interval);
  }, []);

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
        {/* Search Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Search by:
          </label>
          <Select value={searchType} onValueChange={setSearchType}>
            <SelectTrigger className="w-[200px] h-10 bg-background/50 border-muted-foreground/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Restaurant Name</SelectItem>
              <SelectItem value="cuisine">Cuisine Type</SelectItem>
              <SelectItem value="description">Description/Keywords</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Search Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {searchType === 'name' ? 'Restaurant name' : 
               searchType === 'cuisine' ? 'Cuisine type' : 
               'What are you looking for?'}
            </label>
            <Input
              placeholder={searchType === 'name' ? 'e.g., "The Cottage", "Joe\'s Pizza"' :
                         searchType === 'cuisine' ? 'e.g., "Italian", "Chinese", "Mexican"' :
                         'e.g., "Romantic dinner", "Family-friendly"'}
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
            {EXAMPLE_QUERIES.slice(currentExampleIndex, currentExampleIndex + 6).map((example, index) => (
              <Badge
                key={`${currentExampleIndex}-${index}`}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-all duration-300 px-3 py-1 text-xs animate-in fade-in-50"
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
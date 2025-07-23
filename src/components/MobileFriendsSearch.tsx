import { useState, useEffect, useRef } from 'react';
import { Search, Filter, User, Star, MapPin, Heart, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface FriendRestaurant {
  id: string;
  name: string;
  cuisine: string;
  rating?: number;
  address: string;
  city: string;
  price_range?: number;
  michelin_stars?: number;
  created_at: string;
  is_wishlist: boolean;
  friend: {
    id: string;
    username: string;
    name: string;
    avatar_url?: string;
  };
}

interface MobileFriendsSearchProps {
  restaurants: FriendRestaurant[];
  isLoading: boolean;
  onSearch: (query: string) => void;
  onFilterChange: (filters: any) => void;
  onSortChange: (sort: string) => void;
}

export function MobileFriendsSearch({ 
  restaurants, 
  isLoading, 
  onSearch, 
  onFilterChange, 
  onSortChange 
}: MobileFriendsSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract unique values for filters
  const uniqueCuisines = [...new Set(restaurants.map(r => r.cuisine))].sort();
  const uniqueCities = [...new Set(restaurants.map(r => r.city))].sort();
  const uniqueFriends = restaurants.reduce((acc, r) => {
    if (!acc.find(f => f.id === r.friend.id)) {
      acc.push({
        id: r.friend.id,
        name: r.friend.name,
        username: r.friend.username,
        avatar_url: r.friend.avatar_url
      });
    }
    return acc;
  }, [] as any[]).sort((a, b) => a.name.localeCompare(b.name));

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, onSearch]);

  // Update filters when they change
  useEffect(() => {
    onFilterChange({
      filterBy,
      selectedCuisines,
      selectedCities,
      selectedFriends
    });
  }, [filterBy, selectedCuisines, selectedCities, selectedFriends, onFilterChange]);

  // Update sort when it changes
  useEffect(() => {
    onSortChange(sortBy);
  }, [sortBy, onSortChange]);

  const clearSearch = () => {
    setSearchQuery('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const clearAllFilters = () => {
    setFilterBy('all');
    setSelectedCuisines([]);
    setSelectedCities([]);
    setSelectedFriends([]);
  };

  const activeFiltersCount = 
    (filterBy !== 'all' ? 1 : 0) +
    selectedCuisines.length + 
    selectedCities.length + 
    selectedFriends.length;

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return null;
    return '$'.repeat(priceLevel);
  };

  const getMichelinDisplay = (stars?: number) => {
    if (!stars) return null;
    return '⭐'.repeat(stars);
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input 
          placeholder="Search friends' restaurants..." 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 pr-9 h-11 bg-background border-border rounded-lg" 
        />
        {searchQuery && (
          <button 
            onClick={clearSearch} 
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground p-1"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex gap-2">
        {/* Filter Sheet */}
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Options</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Type Filter */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Type</h3>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Restaurants</SelectItem>
                    <SelectItem value="rated">Rated Only</SelectItem>
                    <SelectItem value="wishlist">Wishlist Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cuisines Filter */}
              {uniqueCuisines.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Cuisines</h3>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uniqueCuisines.map(cuisine => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={selectedCuisines.includes(cuisine)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCuisines([...selectedCuisines, cuisine]);
                            } else {
                              setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
                            }
                          }}
                        />
                        <label htmlFor={`cuisine-${cuisine}`} className="text-sm">{cuisine}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cities Filter */}
              {uniqueCities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Cities</h3>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uniqueCities.map(city => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox
                          id={`city-${city}`}
                          checked={selectedCities.includes(city)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCities([...selectedCities, city]);
                            } else {
                              setSelectedCities(selectedCities.filter(c => c !== city));
                            }
                          }}
                        />
                        <label htmlFor={`city-${city}`} className="text-sm">{city}</label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends Filter */}
              {uniqueFriends.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Friends</h3>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {uniqueFriends.map(friend => (
                      <div key={friend.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`friend-${friend.id}`}
                          checked={selectedFriends.includes(friend.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFriends([...selectedFriends, friend.id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(f => f !== friend.id));
                            }
                          }}
                        />
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={friend.avatar_url || ''} />
                            <AvatarFallback className="text-xs">
                              {friend.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <label htmlFor={`friend-${friend.id}`} className="text-sm">{friend.name}</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Clear Filters */}
              <Button variant="outline" onClick={clearAllFilters} className="w-full">
                Clear All Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Sort Selector */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recent</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="alphabetical">A-Z</SelectItem>
            <SelectItem value="friend">Friend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : restaurants.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{restaurant.name}</h4>
                        {restaurant.is_wishlist ? (
                          <Heart className="h-3 w-3 text-red-500" />
                        ) : restaurant.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{restaurant.rating}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mb-1">{restaurant.cuisine}</p>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground truncate">{restaurant.city}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={restaurant.friend.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {restaurant.friend.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">{restaurant.friend.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 ml-2">
                      {restaurant.price_range && (
                        <Badge variant="outline" className="text-xs">
                          {getPriceDisplay(restaurant.price_range)}
                        </Badge>
                      )}
                      {restaurant.michelin_stars && (
                        <Badge variant="secondary" className="text-xs">
                          {getMichelinDisplay(restaurant.michelin_stars)}
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No restaurants found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
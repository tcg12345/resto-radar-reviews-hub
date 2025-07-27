import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, Star, Heart, List, Users, MapPin, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface FilterCounts {
  total: number;
  rated: number;
  wishlist: number;
  cuisines: Record<string, number>;
  cities: Record<string, number>;
}

interface Friend {
  id: string;
  name: string;
  count: number;
}

interface MobileFriendsFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterBy: 'all' | 'rated' | 'wishlist';
  setFilterBy: (filter: 'all' | 'rated' | 'wishlist') => void;
  sortBy: 'recent' | 'rating' | 'alphabetical' | 'friend';
  setSortBy: (sort: 'recent' | 'rating' | 'alphabetical' | 'friend') => void;
  selectedCuisines: string[];
  setSelectedCuisines: (cuisines: string[]) => void;
  selectedCities: string[];
  setSelectedCities: (cities: string[]) => void;
  selectedFriends: string[];
  setSelectedFriends: (friends: string[]) => void;
  uniqueCuisines: string[];
  uniqueCities: string[];
  uniqueFriends: Friend[];
  filterCounts: FilterCounts;
  onClearFilters: () => void;
}

export function MobileFriendsFilters({
  searchQuery,
  setSearchQuery,
  filterBy,
  setFilterBy,
  sortBy,
  setSortBy,
  selectedCuisines,
  setSelectedCuisines,
  selectedCities,
  setSelectedCities,
  selectedFriends,
  setSelectedFriends,
  uniqueCuisines,
  uniqueCities,
  uniqueFriends,
  filterCounts,
  onClearFilters
}: MobileFriendsFiltersProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const totalActiveFilters = selectedCuisines.length + selectedCities.length + selectedFriends.length;
  const hasActiveFilters = searchQuery || sortBy !== 'recent' || filterBy !== 'all' || totalActiveFilters > 0;

  const handleCuisineToggle = (cuisine: string) => {
    if (selectedCuisines.includes(cuisine)) {
      setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
    } else {
      setSelectedCuisines([...selectedCuisines, cuisine]);
    }
  };

  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      setSelectedCities(selectedCities.filter(c => c !== city));
    } else {
      setSelectedCities([...selectedCities, city]);
    }
  };

  const handleFriendToggle = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(f => f !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  const removeCuisine = (cuisine: string) => {
    setSelectedCuisines(selectedCuisines.filter(c => c !== cuisine));
  };

  const removeCity = (city: string) => {
    setSelectedCities(selectedCities.filter(c => c !== city));
  };

  const removeFriend = (friendId: string) => {
    setSelectedFriends(selectedFriends.filter(f => f !== friendId));
    
  };

  const getSelectedFriendName = (friendId: string) => {
    return uniqueFriends.find(f => f.id === friendId)?.name || friendId;
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants, cuisines, cities, or friends..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Quick Filter Tabs */}
      <Tabs value={filterBy} onValueChange={(value) => setFilterBy(value as 'all' | 'rated' | 'wishlist')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-1 text-xs">
            <List className="h-3 w-3" />
            All ({filterCounts.total})
          </TabsTrigger>
          <TabsTrigger value="rated" className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3" />
            Rated ({filterCounts.rated})
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-1 text-xs">
            <Heart className="h-3 w-3" />
            Wishlist ({filterCounts.wishlist})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        {/* Sort Select */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className="flex-1">
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4" />
              <span className="text-sm">Sort</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
            <SelectItem value="friend">By Friend</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced Filters Button */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {totalActiveFilters > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center">
                  {totalActiveFilters}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Refine your search results
              </SheetDescription>
            </SheetHeader>
            
            <ScrollArea className="h-full mt-4">
              <div className="space-y-6 pb-20">
                {/* Cuisines */}
                <div>
                  <h3 className="font-medium mb-3">Cuisines</h3>
                  <div className="space-y-2">
                    {uniqueCuisines.map((cuisine) => (
                      <div key={cuisine} className="flex items-center space-x-3">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={selectedCuisines.includes(cuisine)}
                          onCheckedChange={() => handleCuisineToggle(cuisine)}
                        />
                        <label 
                          htmlFor={`cuisine-${cuisine}`} 
                          className="text-sm flex-1 cursor-pointer flex justify-between"
                        >
                          <span>{cuisine}</span>
                          <span className="text-muted-foreground">({filterCounts.cuisines[cuisine] || 0})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Cities */}
                <div>
                  <h3 className="font-medium mb-3">Cities</h3>
                  <div className="space-y-2">
                    {uniqueCities.map((city) => (
                      <div key={city} className="flex items-center space-x-3">
                        <Checkbox
                          id={`city-${city}`}
                          checked={selectedCities.includes(city)}
                          onCheckedChange={() => handleCityToggle(city)}
                        />
                        <label 
                          htmlFor={`city-${city}`} 
                          className="text-sm flex-1 cursor-pointer flex justify-between"
                        >
                          <span>{city}</span>
                          <span className="text-muted-foreground">({filterCounts.cities[city] || 0})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Friends */}
                <div>
                  <h3 className="font-medium mb-3">Friends</h3>
                  <div className="space-y-2">
                    {uniqueFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`friend-${friend.id}`}
                          checked={selectedFriends.includes(friend.id)}
                          onCheckedChange={() => handleFriendToggle(friend.id)}
                        />
                        <label 
                          htmlFor={`friend-${friend.id}`} 
                          className="text-sm flex-1 cursor-pointer flex justify-between"
                        >
                          <span>{friend.name}</span>
                          <span className="text-muted-foreground">({friend.count})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Sheet Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <div className="flex gap-2">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={onClearFilters} className="flex-1">
                    Clear All
                  </Button>
                )}
                <Button onClick={() => setIsFilterSheetOpen(false)} className="flex-1">
                  Apply Filters
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Clear All Button (when filters are active) */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCuisines.map((cuisine) => (
            <Badge key={cuisine} variant="secondary" className="text-xs">
              {cuisine}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCuisine(cuisine)}
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {selectedCities.map((city) => (
            <Badge key={city} variant="secondary" className="text-xs">
              <MapPin className="h-2 w-2 mr-1" />
              {city}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCity(city)}
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
          {selectedFriends.map((friendId) => (
            <Badge key={friendId} variant="secondary" className="text-xs">
              <Users className="h-2 w-2 mr-1" />
              {getSelectedFriendName(friendId)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFriend(friendId)}
                className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
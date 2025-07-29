import React, { useState } from 'react';
import { Search, Filter, X, ChevronDown, Star, Heart, List, Users, MapPin, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
        <Dialog open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <Button 
            variant="outline" 
            className="relative"
            onClick={() => setIsFilterSheetOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {totalActiveFilters > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center">
                {totalActiveFilters}
              </Badge>
            )}
          </Button>
          
          <DialogContent className="h-[70vh] max-h-[600px] w-[95vw] max-w-none p-0 gap-0 rounded-t-lg rounded-b-none fixed bottom-0 left-1/2 -translate-x-1/2 translate-y-0">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Filters</h2>
                  {totalActiveFilters > 0 && (
                    <Badge variant="secondary" className="h-5 px-2 text-xs">
                      {totalActiveFilters}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  {/* Cuisines */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <span>🍽️</span>
                      Cuisines
                      {selectedCuisines.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {selectedCuisines.length}
                        </Badge>
                      )}
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueCuisines.map((cuisine) => (
                        <div key={cuisine} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCuisines.includes(cuisine)}
                              onCheckedChange={() => handleCuisineToggle(cuisine)}
                            />
                            <span className="text-sm">{cuisine}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({filterCounts.cuisines[cuisine] || 0})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Cities */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Cities
                      {selectedCities.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {selectedCities.length}
                        </Badge>
                      )}
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueCities.map((city) => (
                        <div key={city} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCities.includes(city)}
                              onCheckedChange={() => handleCityToggle(city)}
                            />
                            <span className="text-sm">{city}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({filterCounts.cities[city] || 0})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Friends */}
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Friends
                      {selectedFriends.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {selectedFriends.length}
                        </Badge>
                      )}
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {uniqueFriends.map((friend) => (
                        <div key={friend.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedFriends.includes(friend.id)}
                              onCheckedChange={() => handleFriendToggle(friend.id)}
                            />
                            <span className="text-sm">{friend.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({friend.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              {/* Footer Buttons */}
              <div className="flex p-4 gap-3 border-t bg-background">
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="flex-1"
                  disabled={!hasActiveFilters}
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
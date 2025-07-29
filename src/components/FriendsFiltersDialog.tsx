import { useState } from 'react';
import { Filter, X, Users, MapPin, Utensils } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface FriendsFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uniqueFriends: Array<{ id: string; name: string; count: number }>;
  uniqueCities: string[];
  uniqueCuisines: string[];
  selectedFriends: string[];
  selectedCities: string[];
  selectedCuisines: string[];
  onFriendsChange: (friends: string[]) => void;
  onCitiesChange: (cities: string[]) => void;
  onCuisinesChange: (cuisines: string[]) => void;
  filterCounts: {
    cities: Record<string, number>;
    cuisines: Record<string, number>;
  };
}

export function FriendsFiltersDialog({
  open,
  onOpenChange,
  uniqueFriends,
  uniqueCities,
  uniqueCuisines,
  selectedFriends,
  selectedCities,
  selectedCuisines,
  onFriendsChange,
  onCitiesChange,
  onCuisinesChange,
  filterCounts
}: FriendsFiltersDialogProps) {
  const [localFriends, setLocalFriends] = useState(selectedFriends);
  const [localCities, setLocalCities] = useState(selectedCities);
  const [localCuisines, setLocalCuisines] = useState(selectedCuisines);

  const handleFriendToggle = (friendId: string) => {
    setLocalFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCityToggle = (city: string) => {
    setLocalCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city)
        : [...prev, city]
    );
  };

  const handleCuisineToggle = (cuisine: string) => {
    setLocalCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleClearAll = () => {
    setLocalFriends([]);
    setLocalCities([]);
    setLocalCuisines([]);
  };

  const handleApply = () => {
    onFriendsChange(localFriends);
    onCitiesChange(localCities);
    onCuisinesChange(localCuisines);
    onOpenChange(false);
  };

  const totalFilters = localFriends.length + localCities.length + localCuisines.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[70vh] max-h-[600px] w-[95vw] max-w-none p-0 gap-0 rounded-t-lg rounded-b-none fixed bottom-0 left-1/2 -translate-x-1/2 translate-y-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
              {totalFilters > 0 && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {totalFilters}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Friends Filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Friends</h3>
                  {localFriends.length > 0 && (
                    <Badge variant="outline" className="h-5 px-2 text-xs">
                      {localFriends.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localFriends.includes(friend.id)}
                          onCheckedChange={() => handleFriendToggle(friend.id)}
                        />
                        <span className="text-sm">{friend.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({friend.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Cities Filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Cities</h3>
                  {localCities.length > 0 && (
                    <Badge variant="outline" className="h-5 px-2 text-xs">
                      {localCities.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueCities.map((city) => (
                    <div key={city} className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localCities.includes(city)}
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

              {/* Cuisines Filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Utensils className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">Cuisines</h3>
                  {localCuisines.length > 0 && (
                    <Badge variant="outline" className="h-5 px-2 text-xs">
                      {localCuisines.length}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uniqueCuisines.map((cuisine) => (
                    <div key={cuisine} className="flex items-center justify-between py-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={localCuisines.includes(cuisine)}
                          onCheckedChange={() => handleCuisineToggle(cuisine)}
                        />
                        <span className="text-sm">{cuisine}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({filterCounts.cuisines[cuisine] || 0})</span>
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
              onClick={handleClearAll}
              className="flex-1"
              disabled={totalFilters === 0}
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
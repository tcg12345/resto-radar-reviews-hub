import { useState } from 'react';
import { Filter, Users, MapPin, Utensils, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [cuisinesOpen, setCuisinesOpen] = useState(false);

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

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 z-40"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t rounded-t-xl animate-in slide-in-from-bottom duration-300 h-[80vh]">
        <div className="flex flex-col h-full">
          {/* Drag Handle */}
          <div className="flex justify-center py-2">
            <div className="w-8 h-1 bg-muted-foreground/30 rounded-full"></div>
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-4 bg-background">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
              {totalFilters > 0 && (
                <Badge variant="secondary" className="h-5 px-2 text-xs">
                  {totalFilters}
                </Badge>
              )}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4 bg-background">
            <div className="space-y-4">
              {/* Friends Filter */}
              <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Friends</span>
                      {localFriends.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {localFriends.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${friendsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="p-2 border rounded-md bg-background">
                    {uniqueFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between py-2">
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
                </CollapsibleContent>
              </Collapsible>

              {/* Cities Filter */}
              <Collapsible open={citiesOpen} onOpenChange={setCitiesOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Cities</span>
                      {localCities.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {localCities.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${citiesOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="p-2 border rounded-md bg-background max-h-64 overflow-y-auto">
                    {uniqueCities.map((city) => (
                      <div key={city} className="flex items-center justify-between py-2">
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
                </CollapsibleContent>
              </Collapsible>

              {/* Cuisines Filter */}
              <Collapsible open={cuisinesOpen} onOpenChange={setCuisinesOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Cuisines</span>
                      {localCuisines.length > 0 && (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {localCuisines.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${cuisinesOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="p-2 border rounded-md bg-background max-h-64 overflow-y-auto">
                    {uniqueCuisines.map((cuisine) => (
                      <div key={cuisine} className="flex items-center justify-between py-2">
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
                </CollapsibleContent>
              </Collapsible>
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
      </div>
    </>
  );
}
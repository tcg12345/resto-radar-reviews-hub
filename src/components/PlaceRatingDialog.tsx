import { useState, useEffect, useRef } from 'react';
import { Search, Star, MapPin, Calendar, Camera, Plus, X } from 'lucide-react';
import { MichelinStarIcon } from '@/components/MichelinStarIcon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
import { PlaceRating } from '@/hooks/useTrips';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { supabase } from '@/integrations/supabase/client';

interface PlaceRatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string | null;
  editPlaceId?: string | null;
  editPlaceData?: any;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
  price_level?: number;
}

const RATING_CATEGORIES = {
  restaurant: ['Food Quality', 'Service', 'Atmosphere', 'Value for Money'],
  attraction: ['Experience', 'Crowds', 'Value for Money', 'Accessibility'],
  hotel: ['Cleanliness', 'Service', 'Location', 'Value for Money'],
  museum: ['Exhibits', 'Educational Value', 'Facilities', 'Value for Money'],
  park: ['Nature/Beauty', 'Facilities', 'Cleanliness', 'Accessibility'],
  shopping: ['Selection', 'Prices', 'Service', 'Atmosphere'],
  entertainment: ['Quality', 'Atmosphere', 'Value for Money', 'Experience'],
  transport: ['Cleanliness', 'Punctuality', 'Comfort', 'Value for Money'],
  spa: ['Service', 'Facilities', 'Ambiance', 'Value for Money'],
  bar: ['Drinks Quality', 'Service', 'Atmosphere', 'Value for Money'],
  cafe: ['Coffee Quality', 'Service', 'Atmosphere', 'Value for Money'],
  beach: ['Water Quality', 'Cleanliness', 'Facilities', 'Beauty'],
  landmark: ['Historical Value', 'Accessibility', 'Views', 'Experience'],
  activity: ['Fun Factor', 'Safety', 'Organization', 'Value for Money'],
  other: ['Quality', 'Service', 'Experience', 'Value for Money'],
};

export function PlaceRatingDialog({ isOpen, onClose, tripId, editPlaceId, editPlaceData }: PlaceRatingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [placeType, setPlaceType] = useState<keyof typeof RATING_CATEGORIES>('restaurant');
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [dateVisited, setDateVisited] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const debounceRef = useRef<NodeJS.Timeout>();

  const { addRating, updateRating, addRestaurantToTrip } = usePlaceRatings(tripId || undefined);
  const { restaurants } = useRestaurants();

  const isEditMode = Boolean(editPlaceId && editPlaceData);

  const searchPlaces = async (query: string = searchQuery) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          query: query,
          type: 'search'
        }
      });

      if (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        return;
      }
      
      const results = data?.results || data?.candidates || [];
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceSelect = (place: GooglePlace) => {
    setSelectedPlace(place);
    setSearchResults([]);
    setShowSuggestions(false);
    setSearchQuery(place.name);
    
    // Auto-detect place type
    if (place.types.some(type => ['restaurant', 'food', 'meal_takeaway'].includes(type))) {
      setPlaceType('restaurant');
    } else if (place.types.some(type => ['lodging', 'hotel'].includes(type))) {
      setPlaceType('hotel');
    } else if (place.types.some(type => ['museum'].includes(type))) {
      setPlaceType('museum');
    } else if (place.types.some(type => ['park', 'campground'].includes(type))) {
      setPlaceType('park');
    } else if (place.types.some(type => ['shopping_mall', 'store'].includes(type))) {
      setPlaceType('shopping');
    } else if (place.types.some(type => ['movie_theater', 'amusement_park'].includes(type))) {
      setPlaceType('entertainment');
    } else if (place.types.some(type => ['transit_station', 'airport'].includes(type))) {
      setPlaceType('transport');
    } else if (place.types.some(type => ['spa', 'beauty_salon'].includes(type))) {
      setPlaceType('spa');
    } else if (place.types.some(type => ['bar', 'night_club'].includes(type))) {
      setPlaceType('bar');
    } else if (place.types.some(type => ['cafe'].includes(type))) {
      setPlaceType('cafe');
    } else if (place.types.some(type => ['natural_feature'].includes(type))) {
      setPlaceType('beach');
    } else if (place.types.some(type => ['tourist_attraction', 'point_of_interest'].includes(type))) {
      setPlaceType('landmark');
    } else {
      setPlaceType('attraction');
    }
  };

  // Debounced search for autocomplete
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (value.trim().length > 2) {
      // Debounce the search to avoid too many API calls
      debounceRef.current = setTimeout(() => {
        searchPlaces(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // Initialize form with edit data
  useEffect(() => {
    if (isEditMode && editPlaceData) {
      setSelectedPlace({
        place_id: editPlaceData.place_id || '',
        name: editPlaceData.place_name,
        formatted_address: editPlaceData.address || '',
        geometry: {
          location: {
            lat: editPlaceData.latitude || 0,
            lng: editPlaceData.longitude || 0
          }
        },
        types: [],
        website: editPlaceData.website,
        formatted_phone_number: editPlaceData.phone_number,
        price_level: editPlaceData.price_range
      });
      setSearchQuery(editPlaceData.place_name);
      setPlaceType(editPlaceData.place_type);
      setOverallRating(editPlaceData.overall_rating || 0);
      const ratings = editPlaceData.category_ratings || {};
      setCategoryRatings(ratings);
      
      // Extract custom categories (ones not in predefined categories)
      const predefinedCategories = RATING_CATEGORIES[editPlaceData.place_type] || [];
      const customCats = Object.keys(ratings).filter(cat => !predefinedCategories.includes(cat));
      setCustomCategories(customCats);
      
      setNotes(editPlaceData.notes || '');
      setDateVisited(editPlaceData.date_visited || '');
    }
  }, [isEditMode, editPlaceData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace || !tripId) return;

    setIsLoading(true);
    try {
      const ratingData = {
        trip_id: tripId,
        place_id: selectedPlace.place_id,
        place_name: selectedPlace.name,
        place_type: placeType as PlaceRating['place_type'],
        address: selectedPlace.formatted_address,
        latitude: selectedPlace.geometry.location.lat,
        longitude: selectedPlace.geometry.location.lng,
        overall_rating: overallRating || undefined,
        category_ratings: Object.keys(categoryRatings).length > 0 ? categoryRatings : undefined,
        notes: notes.trim() || undefined,
        date_visited: dateVisited || undefined,
        website: selectedPlace.website,
        phone_number: selectedPlace.formatted_phone_number,
        price_range: selectedPlace.price_level,
      };

      if (isEditMode && editPlaceId) {
        await updateRating(editPlaceId, ratingData);
      } else {
        await addRating(ratingData);
      }

      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPlace(null);
    setPlaceType('restaurant');
    setOverallRating(0);
    setCategoryRatings({});
    setCustomCategories([]);
    setNewCustomCategory('');
    setNotes('');
    setDateVisited('');
    setShowSuggestions(false);
    onClose();
  };

  const addCustomCategory = () => {
    if (newCustomCategory.trim() && !customCategories.includes(newCustomCategory.trim())) {
      setCustomCategories(prev => [...prev, newCustomCategory.trim()]);
      setNewCustomCategory('');
    }
  };

  const removeCustomCategory = (categoryToRemove: string) => {
    setCustomCategories(prev => prev.filter(cat => cat !== categoryToRemove));
    setCategoryRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[categoryToRemove];
      return newRatings;
    });
  };

  const handleAddRestaurantToTrip = async (restaurant: any) => {
    if (!tripId) return;
    
    setIsLoading(true);
    try {
      await addRestaurantToTrip(tripId, {
        name: restaurant.name,
        address: restaurant.address,
        city: restaurant.city,
        country: restaurant.country,
        cuisine: restaurant.cuisine,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        rating: restaurant.rating,
        notes: restaurant.notes,
        photos: restaurant.photos,
        website: restaurant.website,
        phone_number: restaurant.phone_number,
        priceRange: restaurant.priceRange,
        michelinStars: restaurant.michelinStars,
        categoryRatings: restaurant.categoryRatings,
        dateVisited: restaurant.dateVisited,
      });
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const renderStarRating = (rating: number, onRate: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRate(star)}
            className="text-2xl hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {isEditMode ? 'Edit Place Rating' : 'Rate a Place'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update your rating and details for this place'
              : 'Search for and rate places you\'ve visited on your trip'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Search Places</TabsTrigger>
              <TabsTrigger value="restaurants">My Restaurants</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-6">
              {/* Place Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search for a place</Label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search restaurants, attractions, hotels, shops..."
                    className="pl-10"
                    onFocus={() => searchQuery.length > 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchPlaces();
                      }
                    }}
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={() => searchPlaces()}
                  disabled={!searchQuery.trim() || isSearching}
                  className="shrink-0"
                >
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              
              {/* Suggestions Dropdown */}
              {showSuggestions && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-background border rounded-md shadow-lg">
                  {searchResults.map((place) => (
                    <div
                      key={place.place_id}
                      className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                      onClick={() => handlePlaceSelect(place)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{place.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">{place.formatted_address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {place.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs">{place.rating}</span>
                              </div>
                            )}
                            <div className="flex gap-1">
                              {place.types.slice(0, 2).map((type) => (
                                <Badge key={type} variant="secondary" className="text-xs px-1 py-0">
                                  {type.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
            </TabsContent>

            <TabsContent value="restaurants" className="space-y-4">
              <div className="space-y-2">
                <Label>Select from your rated restaurants</Label>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {restaurants?.filter(r => !r.isWishlist).map((restaurant) => (
                    <Card key={restaurant.id} className="cursor-pointer hover:bg-accent transition-colors">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{restaurant.name}</h4>
                            <p className="text-xs text-muted-foreground">{restaurant.address}, {restaurant.city}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {restaurant.rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs">{restaurant.rating}</span>
                                </div>
                              )}
                              <Badge variant="secondary" className="text-xs px-1 py-0">
                                {restaurant.cuisine}
                              </Badge>
                              {restaurant.priceRange && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {'$'.repeat(restaurant.priceRange)}
                                </Badge>
                              )}
                              {restaurant.michelinStars && (
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: restaurant.michelinStars }, (_, i) => (
                                    <MichelinStarIcon key={i} className="w-3 h-3" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddRestaurantToTrip(restaurant)}
                            disabled={isLoading}
                          >
                            Add to Trip
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!restaurants || restaurants.filter(r => !r.isWishlist).length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No rated restaurants found. Rate some restaurants first to add them to your trips.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {selectedPlace && activeTab === 'search' && (
            <>
              {/* Selected Place */}
              <div className="space-y-2">
                <Label>Selected Place</Label>
                <Card>
                  <CardContent className="p-3">
                    <h4 className="font-medium">{selectedPlace.name}</h4>
                    <p className="text-sm text-muted-foreground">{selectedPlace.formatted_address}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Place Type */}
              <div className="space-y-2">
                <Label htmlFor="placeType">Place Type</Label>
                <Select value={placeType} onValueChange={(value: any) => setPlaceType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="attraction">Attraction</SelectItem>
                    <SelectItem value="museum">Museum</SelectItem>
                    <SelectItem value="park">Park</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="spa">Spa & Wellness</SelectItem>
                    <SelectItem value="bar">Bar & Nightlife</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="beach">Beach & Nature</SelectItem>
                    <SelectItem value="landmark">Landmark</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Overall Rating */}
              <div className="space-y-2">
                <Label>Overall Rating</Label>
                {renderStarRating(overallRating, setOverallRating)}
              </div>

              {/* Category Ratings */}
              <div className="space-y-3">
                <Label>Category Ratings</Label>
                
                {/* Predefined Categories */}
                {RATING_CATEGORIES[placeType].map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category}</span>
                    {renderStarRating(
                      categoryRatings[category] || 0,
                      (rating) => setCategoryRatings(prev => ({ ...prev, [category]: rating }))
                    )}
                  </div>
                ))}

                {/* Custom Categories */}
                {customCategories.map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{category}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomCategory(category)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {renderStarRating(
                      categoryRatings[category] || 0,
                      (rating) => setCategoryRatings(prev => ({ ...prev, [category]: rating }))
                    )}
                  </div>
                ))}

                {/* Add Custom Category */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Input
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    placeholder="Add custom rating category..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomCategory();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={addCustomCategory}
                    disabled={!newCustomCategory.trim()}
                    size="sm"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Date Visited */}
              <div className="space-y-2">
                <Label htmlFor="dateVisited">Date Visited</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dateVisited"
                    type="date"
                    value={dateVisited}
                    onChange={(e) => setDateVisited(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Share your experience, tips, or memorable moments..."
                  rows={3}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            {activeTab === 'search' && (
              <Button
                type="submit"
                disabled={isLoading || !selectedPlace || !tripId}
              >
                {isLoading ? 'Saving...' : 'Save Rating'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
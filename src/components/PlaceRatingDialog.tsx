import { useState, useEffect, useRef } from 'react';
import { Search, Star, MapPin, Calendar, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { usePlaceRatings } from '@/hooks/usePlaceRatings';
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
};

export function PlaceRatingDialog({ isOpen, onClose, tripId, editPlaceId, editPlaceData }: PlaceRatingDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GooglePlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlace | null>(null);
  const [placeType, setPlaceType] = useState<'restaurant' | 'attraction' | 'hotel'>('restaurant');
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [dateVisited, setDateVisited] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const { addRating, updateRating } = usePlaceRatings(tripId || undefined);

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
      setCategoryRatings(editPlaceData.category_ratings || {});
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
        place_type: placeType,
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
    setNotes('');
    setDateVisited('');
    setShowSuggestions(false);
    onClose();
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


          {selectedPlace && (
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
                    <SelectItem value="attraction">Attraction</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
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
                {RATING_CATEGORIES[placeType].map((category) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category}</span>
                    {renderStarRating(
                      categoryRatings[category] || 0,
                      (rating) => setCategoryRatings(prev => ({ ...prev, [category]: rating }))
                    )}
                  </div>
                ))}
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
            <Button
              type="submit"
              disabled={isLoading || !selectedPlace || !tripId}
            >
              {isLoading ? 'Saving...' : 'Save Rating'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
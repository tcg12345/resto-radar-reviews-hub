import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Utensils, Star, Clock, Phone, Globe, Loader2, Plane } from 'lucide-react';
import { useAmadeusApi, type PointOfInterest } from '@/hooks/useAmadeusApi';
import { toast } from 'sonner';

interface TravelDestinationDiscoveryProps {
  onAddToItinerary?: (poi: PointOfInterest) => void;
}

export function TravelDestinationDiscovery({ onAddToItinerary }: TravelDestinationDiscoveryProps) {
  const [searchLocation, setSearchLocation] = useState('');
  const [pointsOfInterest, setPointsOfInterest] = useState<PointOfInterest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { getPointsOfInterest } = useAmadeusApi();

  const handleSearchPOI = async () => {
    if (!searchLocation.trim()) {
      toast.error('Please enter a destination to search');
      return;
    }

    setIsLoading(true);
    try {
      // For demo purposes, using NYC coordinates. In a real app, you'd geocode the location first
      const defaultCoords = { lat: 40.7128, lng: -74.0060 }; // NYC
      
      // Try to extract coordinates if it's a known city
      const cityCoords = getCityCoordinates(searchLocation.toLowerCase());
      const coords = cityCoords || defaultCoords;
      
      // For demo purposes, showing mock data while debugging API issues
      const mockResults: PointOfInterest[] = [
        {
          id: '1',
          name: 'Le Bernardin',
          category: 'RESTAURANT',
          geoCode: { latitude: coords.lat, longitude: coords.lng },
          address: { countryCode: 'US', countryName: 'United States', cityName: searchLocation },
          rank: 1,
          tags: ['Fine Dining', 'Seafood', 'Michelin Star']
        },
        {
          id: '2', 
          name: 'Central Park',
          category: 'SIGHTS',
          geoCode: { latitude: coords.lat + 0.01, longitude: coords.lng + 0.01 },
          address: { countryCode: 'US', countryName: 'United States', cityName: searchLocation },
          rank: 2,
          tags: ['Park', 'Nature', 'Tourist Attraction']
        }
      ];
      
      setPointsOfInterest(mockResults);
      
      toast.success(`Found ${mockResults.length} places of interest near ${searchLocation}`);
    } catch (error) {
      console.error('Error searching POI:', error);
      toast.error('Failed to search destinations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCityCoordinates = (city: string) => {
    // Basic city coordinates mapping - in a real app, use geocoding service
    const coordinates: Record<string, { lat: number; lng: number }> = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
    };
    
    return coordinates[city] || null;
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'restaurant':
        return <Utensils className="h-4 w-4" />;
      case 'sights':
        return <MapPin className="h-4 w-4" />;
      case 'tours':
        return <Star className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const formatAddress = (poi: PointOfInterest) => {
    const address = poi.address;
    if (!address) return 'Address not available';
    
    const parts = [];
    if (address.cityName) parts.push(address.cityName);
    if (address.state) parts.push(address.state);
    if (address.countryName) parts.push(address.countryName);
    
    return parts.join(', ');
  };

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-background via-background to-amber-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Plane className="h-5 w-5 text-amber-600" />
          Travel Destination Discovery
        </CardTitle>
        <CardDescription>
          Find restaurants and attractions near your travel destinations using Amadeus travel data
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="flex gap-3">
          <Input
            placeholder="Enter destination (e.g., 'Paris', 'New York', 'Tokyo')"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSearchPOI()}
            className="flex-1"
          />
          <Button 
            onClick={handleSearchPOI}
            disabled={isLoading || !searchLocation.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Popular Destinations */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Popular destinations:
          </p>
          <div className="flex flex-wrap gap-2">
            {['Paris', 'New York', 'Tokyo', 'London', 'Rome', 'Barcelona'].map(city => (
              <Badge
                key={city}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors px-3 py-1"
                onClick={() => setSearchLocation(city)}
              >
                {city}
              </Badge>
            ))}
          </div>
        </div>

        {/* Results */}
        {pointsOfInterest.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Found {pointsOfInterest.length} places near {searchLocation}
              </h3>
              
              <div className="grid gap-4 max-h-96 overflow-y-auto">
                {pointsOfInterest.map((poi) => (
                  <Card key={poi.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(poi.category)}
                            <h4 className="font-semibold text-base">{poi.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {poi.category}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {formatAddress(poi)}
                          </div>
                        </div>
                        
                        {poi.rank && (
                          <Badge variant="outline" className="text-xs">
                            #{poi.rank}
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      {(poi.contacts?.phones || poi.contacts?.emails) && (
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          {poi.contacts.phones && poi.contacts.phones[0] && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {poi.contacts.phones[0].number}
                            </div>
                          )}
                          {poi.contacts.emails && poi.contacts.emails[0] && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {poi.contacts.emails[0].address}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {poi.tags && poi.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {poi.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Add to Itinerary Button */}
                      {onAddToItinerary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAddToItinerary(poi)}
                          className="w-full"
                        >
                          Add to Itinerary
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Searching travel destinations...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
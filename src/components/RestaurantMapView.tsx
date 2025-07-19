import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Phone, Globe, ExternalLink } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount?: number;
  priceRange: number;
  isOpen?: boolean;
  phoneNumber?: string;
  website?: string;
  location: {
    lat: number;
    lng: number;
  };
  cuisine?: string;
  googleMapsUrl?: string;
}

interface RestaurantMapViewProps {
  restaurants: Restaurant[];
  selectedRestaurant?: Restaurant | null;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
}

export function RestaurantMapView({ restaurants, selectedRestaurant, onRestaurantSelect }: RestaurantMapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  const getPriceDisplay = (range: number) => '$'.repeat(Math.min(range, 4));

  useEffect(() => {
    // Map integration will be implemented here when Mapbox is set up
    // For now, show a placeholder
  }, [restaurants]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
      {/* Map Container */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="h-full p-0">
            <div 
              ref={mapContainer} 
              className="h-full w-full rounded-lg bg-muted flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Interactive Map</h3>
                  <p className="text-muted-foreground">
                    Restaurant locations will be displayed here when Mapbox is configured
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing {restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restaurant Details Sidebar */}
      <div className="space-y-4">
        {selectedRestaurant ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-1">
                {selectedRestaurant.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedRestaurant.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rating and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{selectedRestaurant.rating}</span>
                  {selectedRestaurant.reviewCount && (
                    <span className="text-xs text-muted-foreground">
                      ({selectedRestaurant.reviewCount.toLocaleString()})
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={selectedRestaurant.isOpen ? "default" : "secondary"}>
                    {selectedRestaurant.isOpen ? "Open" : "Closed"}
                  </Badge>
                  <span className="text-lg font-bold text-green-600">
                    {getPriceDisplay(selectedRestaurant.priceRange)}
                  </span>
                </div>
              </div>

              {/* Cuisine */}
              {selectedRestaurant.cuisine && (
                <Badge variant="outline" className="text-xs">
                  {selectedRestaurant.cuisine}
                </Badge>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                {selectedRestaurant.phoneNumber && (
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Phone className="h-3 w-3 mr-2" />
                    {selectedRestaurant.phoneNumber}
                  </Button>
                )}
                
                {selectedRestaurant.website && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start"
                    onClick={() => window.open(selectedRestaurant.website, '_blank')}
                  >
                    <Globe className="h-3 w-3 mr-2" />
                    Visit Website
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => window.open(selectedRestaurant.googleMapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(selectedRestaurant.name + ' ' + selectedRestaurant.address)}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  View in Google Maps
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="space-y-4">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Select a Restaurant</h3>
                  <p className="text-muted-foreground">
                    Click on a marker on the map to view restaurant details
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Restaurant List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Restaurants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {restaurants.map((restaurant) => (
              <Button
                key={restaurant.id}
                variant="ghost"
                size="sm"
                className={`w-full justify-start text-left h-auto p-2 ${
                  selectedRestaurant?.id === restaurant.id ? 'bg-muted' : ''
                }`}
                onClick={() => onRestaurantSelect?.(restaurant)}
              >
                <div className="space-y-1">
                  <div className="font-medium line-clamp-1">{restaurant.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {restaurant.rating}
                    <span className="ml-1">{getPriceDisplay(restaurant.priceRange)}</span>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
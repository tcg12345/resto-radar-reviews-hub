import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Star, Hotel, Camera } from 'lucide-react';
import { Trip, PlaceRating } from '@/hooks/useTrips';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { cn } from '@/lib/utils';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TripMapProps {
  trip?: Trip;
  ratings: PlaceRating[];
  onAddPlace: () => void;
}

export function TripMap({ trip, ratings, onAddPlace }: TripMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedRating, setSelectedRating] = useState<PlaceRating | null>(null);
  const { token, isLoading } = useMapboxToken();

  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-74.0066, 40.7135], // Default to NYC
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers when ratings change
  useEffect(() => {
    if (!map.current || !ratings.length) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    const bounds = new mapboxgl.LngLatBounds();
    
    ratings.forEach((rating) => {
      if (!rating.latitude || !rating.longitude) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '14px';
      el.style.fontWeight = 'bold';
      el.style.color = 'white';
      
      // Color based on place type
      if (rating.place_type === 'restaurant') {
        el.style.backgroundColor = '#ef4444';
        el.innerHTML = '🍽️';
      } else if (rating.place_type === 'attraction') {
        el.style.backgroundColor = '#3b82f6';
        el.innerHTML = '📍';
      } else if (rating.place_type === 'hotel') {
        el.style.backgroundColor = '#8b5cf6';
        el.innerHTML = '🏨';
      }
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([rating.longitude, rating.latitude])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        setSelectedRating(rating);
      });

      bounds.extend([rating.longitude, rating.latitude]);
    });

    // Fit map to show all markers
    if (ratings.length > 0) {
      map.current.fitBounds(bounds, { 
        padding: 50,
        maxZoom: 15 
      });
    }
  }, [ratings]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading map...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trip) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a Trip</h3>
            <p className="text-muted-foreground">Choose a trip from the list to view places on the map</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full space-y-4">
      {/* Trip Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{trip.title}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {trip.destination} • {ratings.length} places rated
              </CardDescription>
            </div>
            <Button onClick={onAddPlace} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Place
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Map and Place List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100%-6rem)]">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardContent className="p-0 h-full">
              <div ref={mapContainer} className="w-full h-full rounded-lg" />
            </CardContent>
          </Card>
        </div>

        {/* Place List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Places Visited</CardTitle>
              <CardDescription>
                {ratings.length} places • Click on map markers for details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100%-5rem)] overflow-y-auto px-6 pb-6">
                {ratings.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No places added yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddPlace}
                      className="mt-2"
                    >
                      Add your first place
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ratings.map((rating) => (
                      <PlaceCard
                        key={rating.id}
                        rating={rating}
                        isSelected={selectedRating?.id === rating.id}
                        onClick={() => setSelectedRating(rating)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface PlaceCardProps {
  rating: PlaceRating;
  isSelected: boolean;
  onClick: () => void;
}

function PlaceCard({ rating, isSelected, onClick }: PlaceCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restaurant':
        return <Star className="w-4 h-4" />;
      case 'attraction':
        return <MapPin className="w-4 h-4" />;
      case 'hotel':
        return <Hotel className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'restaurant':
        return 'bg-red-500 text-white';
      case 'attraction':
        return 'bg-blue-500 text-white';
      case 'hotel':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-full", getTypeColor(rating.place_type))}>
          {getTypeIcon(rating.place_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{rating.place_name}</h4>
          {rating.address && (
            <p className="text-sm text-muted-foreground truncate">{rating.address}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs capitalize">
              {rating.place_type}
            </Badge>
            {rating.overall_rating && (
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-medium">{rating.overall_rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {rating.notes && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {rating.notes}
        </p>
      )}
    </div>
  );
}
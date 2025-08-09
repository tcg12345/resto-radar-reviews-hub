import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, ExternalLink, Navigation, Bed, Wifi, Car, Users, Coffee, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Hotel {
  id: string;
  name: string;
  address: string;
  description?: string;
  rating?: number;
  priceRange?: string;
  amenities?: string[];
  photos?: string[];
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  bookingUrl?: string;
}

export function HotelDetailsPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hotelPhotos, setHotelPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (!error && data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    const fetchHotelData = async () => {
      // Get hotel data from sessionStorage or state
      const storedHotel = sessionStorage.getItem(`hotel_${hotelId}`);
      if (storedHotel) {
        const hotelData = JSON.parse(storedHotel);
        setHotel(hotelData);
        
        // Fetch photos from TripAdvisor API
        try {
          const { data: tripAdvisorData, error } = await supabase.functions.invoke('tripadvisor-api', {
            body: {
              action: 'searchLocation',
              searchQuery: `${hotelData.name} ${hotelData.address}`,
            }
          });

          if (!error && tripAdvisorData?.data?.length > 0) {
            const locationId = tripAdvisorData.data[0].location_id;
            
            // Get photos from TripAdvisor
            const { data: photosData, error: photosError } = await supabase.functions.invoke('tripadvisor-api', {
              body: {
                action: 'getPhotos',
                locationId: locationId,
              }
            });

            if (!photosError && photosData?.data?.length > 0) {
              const photoUrls = photosData.data.map((photo: any) => photo.images.large.url);
              setHotelPhotos(photoUrls.slice(0, 5)); // Limit to 5 photos
            }
          }
        } catch (error) {
          console.error('Error fetching hotel photos:', error);
        }
      } else {
        toast.error('Hotel not found');
        navigate('/travel');
      }
      setIsLoading(false);
    };

    fetchHotelData();
  }, [hotelId, navigate]);

  // Initialize map when token and hotel data are available
  useEffect(() => {
    if (!mapboxToken || !hotel || !hotel.latitude || !hotel.longitude || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [hotel.longitude, hotel.latitude],
      zoom: 15
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker for hotel location
    new mapboxgl.Marker({
      color: '#ef4444'
    })
    .setLngLat([hotel.longitude, hotel.latitude])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`<h3 style="margin: 0; font-weight: bold;">${hotel.name}</h3><p style="margin: 4px 0 0 0; font-size: 14px;">${hotel.address}</p>`)
    )
    .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, hotel]);

  const handleBack = () => {
    navigate(-1);
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />;
      case 'restaurant':
        return <Coffee className="w-4 h-4" />;
      case 'parking':
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'room service':
      case 'concierge':
        return <Users className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Hotel not found</h2>
          <Button onClick={() => navigate('/travel')}>Back to Travel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Hotel Image Gallery */}
        <Card className="mb-6 overflow-hidden">
          <div className="relative aspect-[16/9]">
            {hotelPhotos.length > 0 ? (
              <>
                <img 
                  src={hotelPhotos[currentPhotoIndex]} 
                  alt={`${hotel.name} - Photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                  }}
                />
                {hotelPhotos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === 0 ? hotelPhotos.length - 1 : prev - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                      onClick={() => setCurrentPhotoIndex((prev) => prev === hotelPhotos.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {hotelPhotos.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full ${index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'}`}
                          onClick={() => setCurrentPhotoIndex(index)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center h-full">
                <Bed className="w-24 h-24 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </Card>

        {/* Hotel Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{hotel.name}</h1>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{hotel.address}</span>
                </div>
                {hotel.rating && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{hotel.rating.toFixed(1)}</span>
                    </div>
                  </div>
                )}
                {hotel.priceRange && (
                  <Badge variant="secondary" className="text-sm">
                    {hotel.priceRange}
                  </Badge>
                )}
              </div>
            </div>

            {hotel.description && (
              <p className="text-muted-foreground mb-4">{hotel.description}</p>
            )}
          </div>

          <Separator />

          {/* Amenities */}
          {hotel.amenities && hotel.amenities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {hotel.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    {getAmenityIcon(amenity)}
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Contact & Booking */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact & Booking</h3>
            <div className="flex flex-wrap gap-3">
              {hotel.phone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`tel:${hotel.phone}`, '_blank')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Hotel
                </Button>
              )}
              {hotel.website && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(hotel.website, '_blank')}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Website
                </Button>
              )}
              {hotel.bookingUrl && (
                <Button 
                  size="sm" 
                  onClick={() => window.open(hotel.bookingUrl, '_blank')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Book Now
                </Button>
              )}
              {hotel.latitude && hotel.longitude && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`,
                    '_blank'
                  )}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Directions
                </Button>
              )}
            </div>
          </div>

          {/* Map */}
          {hotel.latitude && hotel.longitude && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3">Location</h3>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div 
                      ref={mapContainer} 
                      className="w-full h-64 rounded-lg"
                      style={{ minHeight: '300px' }}
                    />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
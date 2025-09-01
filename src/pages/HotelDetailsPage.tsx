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
  // Stay details added during booking
  stayDetails?: {
    checkIn?: Date | string;
    checkOut?: Date | string;
    location?: string;
    guests?: number;
    rooms?: number;
    roomType?: string;
    specialRequests?: string;
    confirmationNumber?: string;
    totalCost?: string;
    notes?: string;
  };
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
  const [aiOverview, setAiOverview] = useState<string>('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [mapError, setMapError] = useState<string>('');
  const [isMapLoading, setIsMapLoading] = useState(true);
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
        console.log('Hotel data from sessionStorage:', hotelData);
        console.log('Stay details:', hotelData.stayDetails);
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

  // Load AI overview asynchronously after page loads
  useEffect(() => {
    const loadAiOverview = async () => {
      if (!hotel) return;
      
      setIsLoadingOverview(true);
      try {
        const { data: overviewData, error: overviewError } = await supabase.functions.invoke('ai-hotel-overview', {
          body: {
            hotel: hotel,
            detailed: false // Request short overview
          }
        });

        if (!overviewError && overviewData?.overview) {
          setAiOverview(overviewData.overview);
        } else {
          setAiOverview('This hotel offers excellent amenities and service in a prime location.');
        }
      } catch (error) {
        console.error('Error generating AI overview:', error);
        setAiOverview('This hotel offers excellent amenities and service in a prime location.');
      } finally {
        setIsLoadingOverview(false);
      }
    };

    // Add a small delay to let the page render first
    if (hotel) {
      setTimeout(loadAiOverview, 200);
    }
  }, [hotel]);

  // Initialize map when token and hotel data are available
  useEffect(() => {
    if (!mapboxToken || !hotel || !hotel.latitude || !hotel.longitude || !mapContainer.current || map.current) return;

    setIsMapLoading(true);
    setMapError('');

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [hotel.longitude, hotel.latitude],
        zoom: 15
      });

      // Handle map load success
      map.current.on('load', () => {
        setIsMapLoading(false);
        console.log('Map loaded successfully');
      });

      // Handle map load errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('Failed to load map. Please try refreshing the page.');
        setIsMapLoading(false);
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

    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError('Unable to initialize map. Please check your connection and try again.');
      setIsMapLoading(false);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, hotel]);

  const retryMap = () => {
    setMapError('');
    setIsMapLoading(true);
    
    // Clear existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    
    // Trigger re-initialization by forcing a re-render
    setTimeout(() => {
      if (mapContainer.current && mapboxToken && hotel?.latitude && hotel?.longitude) {
        try {
          mapboxgl.accessToken = mapboxToken;
          
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [hotel.longitude, hotel.latitude],
            zoom: 15
          });

          map.current.on('load', () => {
            setIsMapLoading(false);
          });

          map.current.on('error', (e) => {
            console.error('Mapbox retry error:', e);
            setMapError('Map failed to load after retry. Please refresh the page.');
            setIsMapLoading(false);
          });

          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

          new mapboxgl.Marker({
            color: '#ef4444'
          })
          .setLngLat([hotel.longitude, hotel.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<h3 style="margin: 0; font-weight: bold;">${hotel.name}</h3><p style="margin: 4px 0 0 0; font-size: 14px;">${hotel.address}</p>`)
          )
          .addTo(map.current);

        } catch (error) {
          console.error('Error retrying map:', error);
          setMapError('Unable to load map. Please refresh the page.');
          setIsMapLoading(false);
        }
      }
    }, 100);
  };

  const handleBack = () => {
    navigate('/travel');
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
      <div className="max-w-4xl mx-auto px-4 py-6 pt-12">{/* Reduced to pt-12 for less spacing */}
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
      <div className="max-w-4xl mx-auto px-4 py-6 pt-12">{/* Reduced to pt-12 for less spacing */}
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

            {isLoadingOverview ? (
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-muted-foreground leading-relaxed mb-3">{aiOverview}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/hotel/${hotelId}/overview`)}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Detailed Overview
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Stay Details */}
          {hotel.stayDetails && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Stay Details</h3>
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dates & Duration */}
                  {(hotel.stayDetails.checkIn || hotel.stayDetails.checkOut) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Dates
                      </h4>
                      {hotel.stayDetails.checkIn && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Check-in:</span>
                          <span className="text-sm font-medium">
                            {new Date(hotel.stayDetails.checkIn).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {hotel.stayDetails.checkOut && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Check-out:</span>
                          <span className="text-sm font-medium">
                            {new Date(hotel.stayDetails.checkOut).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Room Details */}
                  {(hotel.stayDetails.guests || hotel.stayDetails.rooms || hotel.stayDetails.roomType) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Bed className="w-4 h-4 text-primary" />
                        Room Details
                      </h4>
                      {hotel.stayDetails.guests && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Guests:</span>
                          <span className="text-sm font-medium">{hotel.stayDetails.guests}</span>
                        </div>
                      )}
                      {hotel.stayDetails.rooms && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Rooms:</span>
                          <span className="text-sm font-medium">{hotel.stayDetails.rooms}</span>
                        </div>
                      )}
                      {hotel.stayDetails.roomType && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Room Type:</span>
                          <span className="text-sm font-medium">{hotel.stayDetails.roomType}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking Information */}
                  {(hotel.stayDetails.confirmationNumber || hotel.stayDetails.totalCost) && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Star className="w-4 h-4 text-primary" />
                        Booking Info
                      </h4>
                      {hotel.stayDetails.confirmationNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Confirmation:</span>
                          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {hotel.stayDetails.confirmationNumber}
                          </span>
                        </div>
                      )}
                      {hotel.stayDetails.totalCost && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Total Cost:</span>
                          <Badge variant="secondary" className="font-semibold">
                            {hotel.stayDetails.totalCost}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Trip Location */}
                  {hotel.stayDetails.location && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Trip Location
                      </h4>
                      <Badge variant="outline" className="text-sm w-fit">
                        {hotel.stayDetails.location}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Special Requests & Notes */}
                {(hotel.stayDetails.specialRequests || hotel.stayDetails.notes) && (
                  <div className="mt-6 pt-6 border-t border-border/20">
                    {hotel.stayDetails.specialRequests && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-foreground mb-2">Special Requests</h4>
                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
                          {hotel.stayDetails.specialRequests}
                        </p>
                      </div>
                    )}
                    {hotel.stayDetails.notes && (
                      <div>
                        <h4 className="font-semibold text-foreground mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded-lg">
                          {hotel.stayDetails.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

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
                  <CardContent className="p-0 relative">
                    {/* Map Container */}
                    <div 
                      ref={mapContainer} 
                      className="w-full h-64 rounded-lg"
                      style={{ minHeight: '300px' }}
                    />
                    
                    {/* Loading Overlay */}
                    {isMapLoading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading map...</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Error Overlay */}
                    {mapError && (
                      <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-lg">
                        <div className="text-center p-6">
                          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">{mapError}</p>
                          <Button size="sm" onClick={retryMap} variant="outline">
                            Try Again
                          </Button>
                        </div>
                      </div>
                    )}
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
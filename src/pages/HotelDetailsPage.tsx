import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, ExternalLink, Navigation, Bed, Wifi, Car, Users, Coffee, ChevronLeft, ChevronRight, Calendar, Copy, CreditCard, X, MessageSquare, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [galleryPhotoIndex, setGalleryPhotoIndex] = useState(0);
  const [isStayDetailsExpanded, setIsStayDetailsExpanded] = useState(true);
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
        
        // First try to fetch photos from TripAdvisor API
        try {
          const { data: tripAdvisorData, error } = await supabase.functions.invoke('tripadvisor-api', {
            body: {
              action: 'search',
              searchQuery: `${hotelData.name} ${hotelData.address}`,
            }
          });

          let photosFound = false;
          if (!error && tripAdvisorData?.data?.length > 0) {
            const locationId = tripAdvisorData.data[0].location_id;
            
            // Get photos from TripAdvisor
            const { data: photosData, error: photosError } = await supabase.functions.invoke('tripadvisor-api', {
              body: {
                action: 'photos',
                locationId: locationId,
              }
            });

            if (!photosError && photosData?.data?.length > 0) {
              const photoUrls = photosData.data.map((photo: any) => photo.images.large.url);
              setHotelPhotos(photoUrls.slice(0, 8));
              photosFound = true;
            }
          }

          // If no TripAdvisor photos, try Google Places using the hotel ID
          if (!photosFound && hotelData.id) {
            try {
              const { data: googlePhotosData, error: googleError } = await supabase.functions.invoke('google-places-search', {
                body: {
                  placeId: hotelData.id,
                  type: 'details'
                }
              });

              if (!googleError && googlePhotosData?.result?.photos?.length > 0) {
                // Get photo URLs from Google Places
                const googlePhotoUrls = googlePhotosData.result.photos.slice(0, 8).map((photo: any) => 
                  `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=AIzaSyDGyJd_l_BZAnseiAx5a5n4a1nSBqnS4dA`
                );
                setHotelPhotos(googlePhotoUrls);
                photosFound = true;
              }
            } catch (googleError) {
              console.error('Error fetching Google Places photos:', googleError);
            }
          }

          // If still no photos, try a general search
          if (!photosFound) {
            try {
              const { data: googleSearchData, error: googleSearchError } = await supabase.functions.invoke('google-places-search', {
                body: {
                  query: `${hotelData.name} hotel`,
                  type: 'search'
                }
              });

              if (!googleSearchError && googleSearchData?.results?.length > 0) {
                const place = googleSearchData.results.find((p: any) => 
                  p.name.toLowerCase().includes(hotelData.name.toLowerCase()) && 
                  p.photos && p.photos.length > 0
                );
                
                if (place && place.photos) {
                  const googlePhotoUrls = place.photos.slice(0, 8).map((photo: any) => 
                    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=AIzaSyDGyJd_l_BZAnseiAx5a5n4a1nSBqnS4dA`
                  );
                  setHotelPhotos(googlePhotoUrls);
                  photosFound = true;
                }
              }
            } catch (googleError) {
              console.error('Error fetching Google Places search photos:', googleError);
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

  const copyConfirmationNumber = (confirmationNumber: string) => {
    navigator.clipboard.writeText(confirmationNumber);
    toast.success('Confirmation number copied!');
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity.toLowerCase()) {
      case 'wifi':
      case 'wi-fi':
      case 'internet':
        return <Wifi className="w-4 h-4" />;
      case 'restaurant':
      case 'dining':
      case 'breakfast':
        return <Coffee className="w-4 h-4" />;
      case 'parking':
      case 'car':
      case 'valet':
        return <Car className="w-4 h-4" />;
      case 'room service':
      case 'concierge':
      case 'service':
        return <Users className="w-4 h-4" />;
      case 'spa':
      case 'wellness':
        return <Star className="w-4 h-4" />;
      case 'gym':
      case 'fitness':
        return <Users className="w-4 h-4" />;
      case 'pool':
      case 'swimming':
        return <Star className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          {/* Hero skeleton */}
          <div className="h-80 bg-muted"></div>
          
          <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
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
      {/* Hero Section - Reduced height and tighter layout */}
      <div className="relative h-64 overflow-hidden">
        {hotelPhotos.length > 0 ? (
          <>
            <img
              src={hotelPhotos[0]} 
              alt={`${hotel.name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />
            
            {/* Back button with translucent background */}
            <div className="absolute top-6 left-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="w-10 h-10 p-0 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 border border-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* View More Photos button */}
            {hotelPhotos.length > 1 && (
              <div className="absolute top-6 right-6">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-3 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 border border-white/20 text-xs font-medium"
                  onClick={() => {
                    setShowPhotoGallery(true);
                    setGalleryPhotoIndex(0);
                  }}
                >
                  <span>View Photos ({hotelPhotos.length})</span>
                </Button>
              </div>
            )}

            {/* Hotel info overlay with gradient - reduced margins */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-2xl font-bold text-white">{hotel.name}</h1>
                  <div className="flex items-center gap-3">
                    {hotel.rating && (
                      <Badge className="bg-amber-500/90 text-amber-50 border-0 px-2 py-1 text-sm font-semibold">
                        <Star className="w-3 h-3 fill-current mr-1" />
                        {hotel.rating.toFixed(1)}
                      </Badge>
                    )}
                   </div>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{hotel.address}</span>
                </div>
              </div>
            </div>

          </>
        ) : (
          <div className="relative h-full">
            {/* Try to fetch a generic hotel image or use a hotel placeholder */}
            <img 
              src={`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop&crop=entropy&q=80`}
              alt={`${hotel.name} hotel`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If the image fails to load, replace with another fallback
                e.currentTarget.src = 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=600&fit=crop&crop=entropy&q=80';
                e.currentTarget.onerror = () => {
                  // Final fallback to gradient background
                  e.currentTarget.style.display = 'none';
                  const fallbackDiv = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallbackDiv) fallbackDiv.style.display = 'flex';
                };
              }}
            />
            <div className="bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center h-full absolute inset-0" style={{display: 'none'}}>
              <Bed className="w-24 h-24 text-white/30" />
            </div>
            
            {/* Back button for fallback */}
            <div className="absolute top-6 left-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="w-10 h-10 p-0 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/30 border border-white/20"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>

            {/* Hotel info overlay for fallback */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-2xl font-bold text-white">{hotel.name}</h1>
                  <div className="flex items-center gap-3">
                    {hotel.rating && (
                      <Badge className="bg-amber-500/90 text-amber-50 border-0 px-2 py-1 text-sm font-semibold">
                        <Star className="w-3 h-3 fill-current mr-1" />
                        {hotel.rating.toFixed(1)}
                      </Badge>
                    )}
                    {hotel.priceRange && (
                      <div className="text-white">
                        <span className="text-xl font-bold">{hotel.priceRange}</span>
                        <span className="text-white/80 text-xs ml-1">per night</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{hotel.address}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section - Reduced margins for edge-to-edge feel */}
      <div className="w-full px-3 py-3 space-y-5">
        
        {/* Hotel Overview Card */}
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Star className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-bold">About this hotel</h2>
            </div>
            {isLoadingOverview ? (
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-4/5"></div>
                <div className="h-3 bg-muted rounded animate-pulse w-3/5"></div>
              </div>
            ) : (
              <p className="text-muted-foreground leading-relaxed text-sm">{aiOverview}</p>
            )}
          </CardContent>
        </Card>

        {/* Stay Details Dropdown Card */}
        {hotel.stayDetails && (
          <Card className="shadow-sm border-border/50">
            {/* Clickable Header */}
            <div 
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setIsStayDetailsExpanded(!isStayDetailsExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold">Your Stay Details</h3>
              </div>
              {isStayDetailsExpanded ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            {/* Collapsible Content */}
            {isStayDetailsExpanded && (
              <CardContent className="p-5 pt-0 bg-background border-t border-border/30 z-10">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dates Section */}
                {(hotel.stayDetails.checkIn || hotel.stayDetails.checkOut) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-semibold text-base text-foreground">Stay Dates</h4>
                    </div>
                    <div className="space-y-3">
                      {hotel.stayDetails.checkIn && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Check-in</div>
                          <div className="text-lg font-bold text-foreground">
                            {new Date(hotel.stayDetails.checkIn).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        )}
                      {hotel.stayDetails.checkOut && (
                        <div className="bg-muted/30 rounded-lg p-4">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Check-out</div>
                          <div className="text-lg font-bold text-foreground">
                            {new Date(hotel.stayDetails.checkOut).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Room Details Section */}
                {(hotel.stayDetails.guests || hotel.stayDetails.rooms || hotel.stayDetails.roomType) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <h4 className="font-semibold text-base text-foreground">Room Details</h4>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      {hotel.stayDetails.guests && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Guests</span>
                          <span className="font-semibold text-foreground">{hotel.stayDetails.guests}</span>
                        </div>
                        )}
                      {hotel.stayDetails.rooms && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Rooms</span>
                          <span className="font-semibold text-foreground">{hotel.stayDetails.rooms}</span>
                        </div>
                        )}
                      {hotel.stayDetails.roomType && (
                        <div className="pt-2 border-t border-border/30">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Room Type</div>
                          <div className="font-semibold text-foreground">{hotel.stayDetails.roomType}</div>
                        </div>
                        )}
                      </div>
                    </div>
                  )}

              </div>

              {/* Booking Information Section */}
              {(hotel.stayDetails.confirmationNumber || hotel.stayDetails.totalCost) && (
                <div className="mt-6 pt-6 border-t border-border/30">
                  <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-base text-foreground">Booking Information</h4>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 space-y-4">
                    {hotel.stayDetails.totalCost && (
                      <div className="text-center pb-3 border-b border-border/30">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Total Cost</div>
                        <div className="text-2xl font-bold text-primary">${hotel.stayDetails.totalCost}</div>
                        {hotel.stayDetails.checkIn && hotel.stayDetails.checkOut && (() => {
                          const checkInDate = new Date(hotel.stayDetails.checkIn);
                          const checkOutDate = new Date(hotel.stayDetails.checkOut);
                          const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
                          const numberOfNights = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          const pricePerNight = (parseFloat(hotel.stayDetails.totalCost.toString()) / numberOfNights).toFixed(2);
                          
                          return numberOfNights > 0 ? (
                            <div className="text-sm text-muted-foreground mt-2">
                              ${pricePerNight} per night × {numberOfNights} night{numberOfNights !== 1 ? 's' : ''}
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )}
                    {hotel.stayDetails.confirmationNumber && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Confirmation Number</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyConfirmationNumber(hotel.stayDetails!.confirmationNumber!)}
                          className="h-8 px-2 text-xs font-mono hover:bg-primary/10"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {hotel.stayDetails.confirmationNumber}
                        </Button>
                      </div>
                     )}
                   </div>
                 </div>
               )}

              {/* Special Requests & Notes */}
              {(hotel.stayDetails.specialRequests || hotel.stayDetails.notes) && (
                <div className="mt-6 pt-6 border-t border-border/30 space-y-4">
                  {hotel.stayDetails.specialRequests && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <h5 className="font-semibold text-sm text-foreground">Special Requests</h5>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4 border border-border/20">
                        <p className="text-sm text-muted-foreground leading-relaxed">{hotel.stayDetails.specialRequests}</p>
                      </div>
                    </div>
                  )}
                  {hotel.stayDetails.notes && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <h5 className="font-semibold text-sm text-foreground">Additional Notes</h5>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4 border border-border/20">
                        <p className="text-sm text-muted-foreground leading-relaxed">{hotel.stayDetails.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </CardContent>
            )}
          </Card>
        )}

        {/* Amenities Card */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Wifi className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold">Amenities</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hotel.amenities.map((amenity, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/20"
                  >
                    {getAmenityIcon(amenity)}
                    <span className="text-sm font-medium text-foreground truncate">{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact & Booking Card */}
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-bold">Contact & Booking</h3>
            </div>
            
            {/* Primary booking button */}
            {hotel.bookingUrl && (
              <Button 
                size="lg"
                onClick={() => window.open(hotel.bookingUrl, '_blank')}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary rounded-lg mb-4"
              >
                Book Now
              </Button>
            )}
            
            {/* Secondary action buttons */}
            <div className="grid grid-cols-4 gap-3">
              {hotel.phone && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`tel:${hotel.phone}`, '_self')}
                  className="flex items-center gap-2 h-11 rounded-lg text-xs font-medium"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">Call</span>
                </Button>
              )}
              
              {hotel.website && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(hotel.website, '_blank')}
                  className="flex items-center gap-2 h-11 rounded-lg text-xs font-medium"
                >
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">Website</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => hotel.website && window.open(hotel.website, '_blank')}
                className="flex items-center gap-2 h-11 rounded-lg text-xs font-medium"
                disabled={!hotel.website}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Contact</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.address)}`, '_blank')}
                className="flex items-center gap-2 h-11 rounded-lg text-xs font-medium"
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">Directions</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Location Map Card */}
        {hotel.latitude && hotel.longitude && (
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <MapPin className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold">Location</h3>
              </div>
              
              <div className="relative h-48 rounded-xl overflow-hidden border border-border/20 shadow-sm bg-muted/10">
                {isMapLoading && (
                  <div className="absolute inset-0 bg-muted flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {mapError && (
                  <div className="absolute inset-0 bg-muted flex flex-col items-center justify-center text-center p-4">
                    <MapPin className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground mb-3">{mapError}</p>
                    <Button onClick={retryMap} variant="outline" size="sm">
                      Retry
                    </Button>
                  </div>
                )}
                
                <div ref={mapContainer} className="w-full h-full" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo Gallery Modal */}
      {showPhotoGallery && hotelPhotos.length > 0 && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setShowPhotoGallery(false)}
            className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Photo counter */}
          <div className="absolute top-6 left-6 z-10 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
            {galleryPhotoIndex + 1} of {hotelPhotos.length}
          </div>

          {/* Main photo */}
          <div className="relative w-full h-full flex items-center justify-center px-4">
            <img
              src={hotelPhotos[galleryPhotoIndex]}
              alt={`${hotel.name} - Photo ${galleryPhotoIndex + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.style.display = 'none';
              }}
            />

            {/* Navigation arrows */}
            {hotelPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryPhotoIndex((prev) => prev === 0 ? hotelPhotos.length - 1 : prev - 1)}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setGalleryPhotoIndex((prev) => prev === hotelPhotos.length - 1 ? 0 : prev + 1)}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {hotelPhotos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 px-6 py-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 max-w-full overflow-x-auto">
              {hotelPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryPhotoIndex(index)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    index === galleryPhotoIndex ? 'border-white' : 'border-white/30 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, ExternalLink, Navigation, Bed, Wifi, Car, Users, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

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

  useEffect(() => {
    // Get hotel data from sessionStorage or state
    const storedHotel = sessionStorage.getItem(`hotel_${hotelId}`);
    if (storedHotel) {
      setHotel(JSON.parse(storedHotel));
    } else {
      toast.error('Hotel not found');
      navigate('/travel');
    }
    setIsLoading(false);
  }, [hotelId, navigate]);

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

        {/* Hotel Image */}
        <Card className="mb-6 overflow-hidden">
          <div className="aspect-[16/9] bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
            <Bed className="w-24 h-24 text-muted-foreground/30" />
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
                    <div className="aspect-[16/9] bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Map view</p>
                        <p className="text-xs text-muted-foreground">{hotel.latitude}, {hotel.longitude}</p>
                      </div>
                    </div>
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
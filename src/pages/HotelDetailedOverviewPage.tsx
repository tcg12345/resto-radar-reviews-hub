import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, ExternalLink, Phone, Globe, Navigation, Bed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';

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

export function HotelDetailedOverviewPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailedOverview, setDetailedOverview] = useState<string>('');
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  useEffect(() => {
    const fetchHotelData = async () => {
      const storedHotel = sessionStorage.getItem(`hotel_${hotelId}`);
      if (storedHotel) {
        const hotelData = JSON.parse(storedHotel);
        setHotel(hotelData);
      } else {
        navigate('/travel');
      }
      setIsLoading(false);
    };

    fetchHotelData();
  }, [hotelId, navigate]);

  // Load detailed AI overview asynchronously after page loads
  useEffect(() => {
    const loadDetailedOverview = async () => {
      if (!hotel) return;
      
      setIsLoadingOverview(true);
      try {
        const { data: overviewData, error: overviewError } = await supabase.functions.invoke('ai-hotel-overview', {
          body: {
            hotel: hotel,
            detailed: true
          }
        });

        if (!overviewError && overviewData?.overview) {
          setDetailedOverview(overviewData.overview);
        } else {
          setDetailedOverview('This exceptional hotel offers an unparalleled luxury experience with world-class amenities, elegant accommodations, and impeccable service. Located in a prime destination, it provides guests with sophisticated comfort and access to the finest local attractions, dining, and cultural experiences. The property features meticulously designed rooms and suites, each thoughtfully appointed with premium furnishings and modern conveniences. Guests can enjoy exceptional dining venues, comprehensive wellness facilities, and personalized service that anticipates every need, making this an ideal choice for discerning travelers seeking both luxury and authentic local experiences.');
        }
      } catch (error) {
        console.error('Error generating detailed AI overview:', error);
        setDetailedOverview('This exceptional hotel offers an unparalleled luxury experience with world-class amenities, elegant accommodations, and impeccable service. Located in a prime destination, it provides guests with sophisticated comfort and access to the finest local attractions, dining, and cultural experiences.');
      } finally {
        setIsLoadingOverview(false);
      }
    };

    // Small delay to let the page render first
    if (hotel) {
      setTimeout(loadDetailedOverview, 100);
    }
  }, [hotel]);

  const handleBack = () => {
    navigate(`/hotel/${hotelId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-6 pt-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-full"></div>
              <div className="h-6 bg-muted rounded w-5/6"></div>
              <div className="h-6 bg-muted rounded w-4/5"></div>
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
      <div className="max-w-4xl mx-auto px-4 py-6 pt-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hotel
          </Button>
        </div>

        {/* Hotel Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold mb-2">{hotel.name}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{hotel.address}</span>
                </div>
                <div className="flex items-center gap-4">
                  {hotel.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{hotel.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {hotel.priceRange && (
                    <Badge variant="secondary" className="text-sm">
                      {hotel.priceRange}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Detailed Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Detailed Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingOverview ? (
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-5/6"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-4/5"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-full"></div>
                <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                {detailedOverview.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-foreground leading-relaxed mb-4 last:mb-0">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hotel Features */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Amenities & Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {hotel.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{amenity}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact & Booking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Contact & Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {hotel.phone && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`tel:${hotel.phone}`, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call Hotel
                </Button>
              )}
              {hotel.website && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(hotel.website, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Official Website
                </Button>
              )}
              {hotel.bookingUrl && (
                <Button 
                  onClick={() => window.open(hotel.bookingUrl, '_blank')}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Book Now
                </Button>
              )}
              {hotel.latitude && hotel.longitude && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${hotel.latitude},${hotel.longitude}`,
                    '_blank'
                  )}
                  className="flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
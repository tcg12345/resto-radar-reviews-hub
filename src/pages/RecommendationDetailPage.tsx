import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, Heart, Plus, Share2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PhotoGallery } from '@/components/PhotoGallery';
import { PriceRange } from '@/components/PriceRange';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { supabase } from '@/integrations/supabase/client';

interface RecommendationRestaurant {
  name: string;
  cuisine: string;
  address: string;
  distance?: number;
  rating?: number;
  priceRange?: number;
  openingHours?: string;
  isOpen?: boolean;
  photos?: string[];
  place_id?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  website?: string;
  phone?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
}

export function RecommendationDetailPage() {
  const { place_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<RecommendationRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Get restaurant data from location state if available
  const restaurantFromState = location.state?.restaurant as RecommendationRestaurant;

  const fetchPlaceDetails = async (placeId: string) => {
    try {
      setIsLoadingDetails(true);
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          place_id: placeId,
          fields: ['website', 'formatted_phone_number', 'opening_hours']
        }
      });
      
      if (error) {
        console.error('Error fetching place details:', error);
        return;
      }
      
      if (data?.result) {
        setRestaurant(prev => prev ? {
          ...prev,
          website: data.result.website || prev.website,
          formatted_phone_number: data.result.formatted_phone_number || prev.formatted_phone_number,
          opening_hours: data.result.opening_hours || prev.opening_hours
        } : null);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (restaurantFromState) {
      setRestaurant(restaurantFromState);
      setPhotos(restaurantFromState.photos || []);
      setIsLoading(false);
      
      // Fetch additional details if we have a place_id and missing website/phone
      if (restaurantFromState.place_id && (!restaurantFromState.website || !restaurantFromState.formatted_phone_number)) {
        fetchPlaceDetails(restaurantFromState.place_id);
      }
    } else if (place_id) {
      // If no state data, you could fetch from Google Places API here
      // For now, we'll show an error since we don't have the data
      toast.error('Restaurant details not found');
      navigate(-1);
    }
  }, [place_id, restaurantFromState, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleAddToList = () => {
    // Implement add to list functionality
    toast.success('Added to your list!');
  };

  const handleAddToWishlist = () => {
    // Implement add to wishlist functionality
    toast.success('Added to wishlist!');
  };

  const handleShare = () => {
    if (navigator.share && restaurant) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} - ${restaurant.cuisine} cuisine`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleCall = () => {
    if (restaurant?.phone || restaurant?.formatted_phone_number) {
      window.location.href = `tel:${restaurant.phone || restaurant.formatted_phone_number}`;
    }
  };

  const handleWebsite = () => {
    if (restaurant?.website) {
      window.open(restaurant.website, '_blank');
    }
  };

  const handleDirections = () => {
    if (restaurant?.latitude && restaurant?.longitude) {
      // Use device's default map app
      const url = `https://maps.google.com/maps?daddr=${restaurant.latitude},${restaurant.longitude}`;
      window.open(url, '_blank');
    } else if (restaurant?.address) {
      // Fallback to address search
      const encodedAddress = encodeURIComponent(`${restaurant.address}, ${restaurant.city || ''}`);
      const url = `https://maps.google.com/maps?daddr=${encodedAddress}`;
      window.open(url, '_blank');
    }
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return `${distance.toFixed(1)} mi away`;
  };

  const getOpeningStatus = () => {
    if (!restaurant) return '';
    if (restaurant.isOpen === undefined) return '';
    return restaurant.isOpen ? 'Open now' : 'Closed';
  };

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
        
        {/* Loading content */}
        <div className="p-4 space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Restaurant not found</h2>
          <Button onClick={handleBack}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold truncate">{restaurant.name}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="h-8 w-8 p-0"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="pb-safe">
        {/* Photos */}
        {photos.length > 0 && (
          <div className="aspect-video bg-muted relative overflow-hidden">
            <img 
              src={photos[0]} 
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Main Content */}
        <div className="p-4 space-y-6">
          {/* Restaurant Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">{restaurant.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {restaurant.priceRange && (
                    <Badge variant="outline" className="text-sm">
                      {getPriceDisplay(restaurant.priceRange)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-sm">
                    {restaurant.cuisine}
                  </Badge>
                  {restaurant.distance && (
                    <Badge variant="outline" className="text-sm">
                      {formatDistance(restaurant.distance)}
                    </Badge>
                  )}
                </div>
              </div>
              {restaurant.rating && (
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{restaurant.rating.toFixed(1)}</div>
                    <Star className="h-3 w-3 fill-primary text-primary mx-auto" />
                  </div>
                </div>
              )}
            </div>

            {/* Status and Hours */}
            {restaurant.isOpen !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${restaurant.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {getOpeningStatus()}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {(restaurant.phone || restaurant.formatted_phone_number) && (
              <Button 
                onClick={handleCall} 
                className="flex items-center gap-2"
                variant="default"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            )}
            <Button 
              onClick={handleDirections} 
              className="flex items-center gap-2"
              variant="default"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </Button>
            {restaurant.website && (
              <Button 
                onClick={handleWebsite} 
                className="flex items-center gap-2"
                variant="default"
              >
                <Globe className="h-4 w-4" />
                Website
              </Button>
            )}
          </div>

          {/* Secondary Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={handleAddToList} variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add to List
            </Button>
            <Button variant="outline" onClick={handleAddToWishlist} className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Wishlist
            </Button>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Details</h2>
            
            {/* Address */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{restaurant.address}</p>
                    {restaurant.city && (
                      <p className="text-sm text-muted-foreground">{restaurant.city}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            {(restaurant.phone || restaurant.formatted_phone_number || restaurant.website) && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium">Contact</h3>
                  
                  {(restaurant.phone || restaurant.formatted_phone_number) && (
                    <Button
                      variant="ghost"
                      onClick={handleCall}
                      className="w-full justify-start p-0 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">
                            {restaurant.formatted_phone_number || restaurant.phone}
                          </p>
                        </div>
                      </div>
                    </Button>
                  )}

                  {restaurant.website && (
                    <Button
                      variant="ghost"
                      onClick={handleWebsite}
                      className="w-full justify-start p-0 h-auto"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Website</p>
                          <p className="text-sm text-muted-foreground">Visit website</p>
                        </div>
                      </div>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Opening Hours */}
            {restaurant.opening_hours?.weekday_text && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Hours</h3>
                  <OpeningHoursDisplay 
                    hours={restaurant.opening_hours.weekday_text}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
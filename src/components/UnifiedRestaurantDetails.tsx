import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, Heart, Plus, Share2, Navigation, ExternalLink, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { OpeningHoursDisplay } from '@/components/OpeningHoursDisplay';
import { PriceRange } from '@/components/PriceRange';
import { MichelinStars } from '@/components/MichelinStars';
import { StarRating } from '@/components/StarRating';
import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { PhotoGallery } from '@/components/PhotoGallery';
import { FriendPhotoGallery } from '@/components/FriendPhotoGallery';
import { CommunityRating } from '@/components/CommunityRating';
import { UnifiedPhotoGallery } from '@/components/UnifiedPhotoGallery';
import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';
import { useCommunityData } from '@/contexts/CommunityDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
interface UnifiedRestaurantData {
  id?: string;
  place_id?: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
  cuisine: string;
  rating?: number;
  reviewCount?: number;
  priceRange?: number;
  price_range?: number;
  michelinStars?: number;
  michelin_stars?: number;
  openingHours?: string;
  opening_hours?: any;
  isOpen?: boolean;
  photos?: string[];
  website?: string;
  phone?: string;
  phone_number?: string;
  formatted_phone_number?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  photoCaptions?: string[];
  photo_captions?: string[];
  dateVisited?: string;
  date_visited?: string;
  isWishlist?: boolean;
  is_wishlist?: boolean;
  reservable?: boolean;
  reservationUrl?: string;
  reservation_url?: string;
  userId?: string;
  user_id?: string;
  // For shared restaurants
  sharedBy?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
  isSharedRestaurant?: boolean;
}
interface UnifiedRestaurantDetailsProps {
  restaurant: UnifiedRestaurantData;
  onBack?: () => void;
  showBackButton?: boolean;
  isLoading?: boolean;
  onToggleWishlist?: () => void;
  canAddToWishlist?: boolean;
  isMobile?: boolean;
}
export function UnifiedRestaurantDetails({
  restaurant,
  onBack,
  showBackButton = true,
  isLoading = false,
  onToggleWishlist,
  canAddToWishlist = true,
  isMobile = false
}: UnifiedRestaurantDetailsProps) {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    setPreloadedStats
  } = useCommunityData();
  const actualIsMobile = useIsMobile();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [restaurantData, setRestaurantData] = useState(restaurant);
  const [isAdding, setIsAdding] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Community features
  const {
    communityStats,
    reviews,
    isLoading: isLoadingReviews,
    submitReview
  } = useRestaurantReviews(restaurantData.place_id);

  // Save community stats to context for preloading
  useEffect(() => {
    if (communityStats && restaurantData.place_id) {
      setPreloadedStats(restaurantData.place_id, communityStats);
    }
  }, [communityStats, restaurantData.place_id, setPreloadedStats]);
  useEffect(() => {
    setRestaurantData(restaurant);
    setPhotos(restaurant.photos || []);

    // Fetch additional details if we have a place_id and missing info
    if (restaurant.place_id && (!restaurant.website || !restaurant.formatted_phone_number)) {
      fetchPlaceDetails(restaurant.place_id);
    }

    // Enhance with AI if cuisine is generic or Michelin stars are unknown
    if (shouldEnhanceWithAI(restaurant)) {
      enhanceWithAI(restaurant);
    }
  }, [restaurant]);
  const shouldEnhanceWithAI = (restaurant: UnifiedRestaurantData): boolean => {
    const hasGenericCuisine = !restaurant.cuisine || restaurant.cuisine.toLowerCase().includes('restaurant') || restaurant.cuisine.toLowerCase().includes('bar') || restaurant.cuisine.toLowerCase().includes('food') || restaurant.cuisine.toLowerCase().includes('establishment');
    const hasMissingMichelinInfo = restaurant.michelinStars === undefined && restaurant.michelin_stars === undefined;
    return hasGenericCuisine || hasMissingMichelinInfo;
  };
  const enhanceWithAI = async (restaurant: UnifiedRestaurantData) => {
    try {
      setIsEnhancingWithAI(true);

      // Run both AI functions in parallel for speed
      const promises = [];

      // Enhance cuisine if needed
      const hasGenericCuisine = !restaurant.cuisine || restaurant.cuisine.toLowerCase().includes('restaurant') || restaurant.cuisine.toLowerCase().includes('bar') || restaurant.cuisine.toLowerCase().includes('food') || restaurant.cuisine.toLowerCase().includes('establishment');
      if (hasGenericCuisine) {
        promises.push(supabase.functions.invoke('ai-cuisine-detector', {
          body: {
            restaurantName: restaurant.name,
            address: restaurant.address,
            types: restaurant.cuisine ? [restaurant.cuisine] : []
          }
        }));
      } else {
        promises.push(Promise.resolve({
          data: {
            cuisine: restaurant.cuisine
          }
        }));
      }

      // Detect Michelin stars if missing
      const hasMissingMichelinInfo = restaurant.michelinStars === undefined && restaurant.michelin_stars === undefined;
      if (hasMissingMichelinInfo) {
        promises.push(supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: restaurant.name,
            address: restaurant.address,
            city: restaurant.city || '',
            country: restaurant.country || '',
            cuisine: restaurant.cuisine,
            notes: restaurant.notes || ''
          }
        }));
      } else {
        promises.push(Promise.resolve({
          data: {
            michelinStars: restaurant.michelinStars || restaurant.michelin_stars
          }
        }));
      }

      // Wait for both to complete
      const [cuisineResult, michelinResult] = await Promise.all(promises);

      // Update restaurant data with AI enhancements
      setRestaurantData(prev => ({
        ...prev,
        cuisine: cuisineResult?.data?.cuisine || prev.cuisine,
        michelinStars: michelinResult?.data?.michelinStars !== undefined ? michelinResult.data.michelinStars : prev.michelinStars || prev.michelin_stars || 0
      }));
    } catch (error) {
      console.error('Error enhancing restaurant with AI:', error);
      // Silently fail - don't show error to user for this enhancement
    } finally {
      setIsEnhancingWithAI(false);
    }
  };
  const fetchPlaceDetails = async (placeId: string) => {
    try {
      setIsLoadingDetails(true);
      const {
        data,
        error
      } = await supabase.functions.invoke('google-places-search', {
        body: {
          type: 'details',
          placeId: placeId
        }
      });
      if (error) {
        console.error('Error fetching place details:', error);
        return;
      }
      if (data?.result) {
        setRestaurantData(prev => ({
          ...prev,
          website: data.result.website || prev.website,
          formatted_phone_number: data.result.formatted_phone_number || prev.formatted_phone_number,
          phone: data.result.formatted_phone_number || prev.phone,
          opening_hours: data.result.opening_hours || prev.opening_hours
        }));
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };
  const handleAddToWishlist = async () => {
    if (!user || !restaurantData) return;
    if (onToggleWishlist) {
      onToggleWishlist();
      return;
    }
    setIsAdding(true);
    try {
      const {
        error
      } = await supabase.from('restaurants').insert({
        name: restaurantData.name,
        address: restaurantData.address,
        city: restaurantData.city || '',
        country: restaurantData.country || '',
        cuisine: restaurantData.cuisine,
        rating: restaurantData.rating,
        price_range: restaurantData.priceRange || restaurantData.price_range,
        michelin_stars: restaurantData.michelinStars || restaurantData.michelin_stars,
        photos: restaurantData.photos || [],
        notes: restaurantData.notes || '',
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        website: restaurantData.website || '',
        phone_number: restaurantData.phone || restaurantData.phone_number || restaurantData.formatted_phone_number || '',
        opening_hours: typeof restaurantData.opening_hours === 'object' ? restaurantData.opening_hours?.weekday_text?.join('\n') || '' : restaurantData.opening_hours || restaurantData.openingHours || '',
        reservable: restaurantData.reservable || false,
        reservation_url: restaurantData.reservationUrl || restaurantData.reservation_url || '',
        is_wishlist: true,
        user_id: user.id
      });
      if (error) {
        console.error('Error adding to wishlist:', error);
        toast.error('Failed to add to wishlist');
        return;
      }
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setIsAdding(false);
    }
  };
  const handleShare = () => {
    if (navigator.share && restaurantData) {
      navigator.share({
        title: restaurantData.name,
        text: `Check out ${restaurantData.name} - ${restaurantData.cuisine} cuisine`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };
  const handleCall = () => {
    const phoneNumber = restaurantData.phone || restaurantData.phone_number || restaurantData.formatted_phone_number;
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
    }
  };
  const handleWebsite = () => {
    if (restaurantData.website) {
      window.open(restaurantData.website, '_blank');
    }
  };
  const handleDirections = () => {
    if (restaurantData.latitude && restaurantData.longitude) {
      const url = `https://maps.google.com/maps?daddr=${restaurantData.latitude},${restaurantData.longitude}`;
      window.open(url, '_blank');
    } else if (restaurantData.address) {
      const encodedAddress = encodeURIComponent(`${restaurantData.address}, ${restaurantData.city || ''}`);
      const url = `https://maps.google.com/maps?daddr=${encodedAddress}`;
      window.open(url, '_blank');
    }
  };
  const getPhoneNumber = () => {
    return restaurantData.phone || restaurantData.phone_number || restaurantData.formatted_phone_number;
  };
  const getOpeningHours = () => {
    if (typeof restaurantData.opening_hours === 'object' && restaurantData.opening_hours?.weekday_text) {
      return restaurantData.opening_hours.weekday_text;
    }
    if (restaurantData.opening_hours || restaurantData.openingHours) {
      return (restaurantData.opening_hours || restaurantData.openingHours).split('\n');
    }
    return null;
  };
  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return '';
    return '$'.repeat(priceRange);
  };
  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return `${distance.toFixed(1)} mi away`;
  };
  if (isLoading) {
    return <>
        {/* Mobile status bar spacer */}
        <div className="lg:hidden h-[35px] bg-background flex-shrink-0"></div>
        <div className="min-h-screen bg-background">
        {/* Header */}
        {showBackButton && <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
            <div className="flex items-center gap-4 p-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
            </div>
          </div>}
        
        {/* Loading content */}
        <div className="p-4 space-y-4">
          <div className="h-48 bg-muted animate-pulse rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
        </div>
        </div>
      </>;
  }
  return <>
      {/* Mobile status bar spacer */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-[35px] bg-background z-50"></div>
      <div className="min-h-screen bg-background">
      {/* Header */}
      {showBackButton && <div className="sticky top-[35px] lg:top-0 z-50 bg-background backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-10 w-10 p-0 touch-manipulation" aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold truncate">{restaurantData.name}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 p-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>}

      <div className={`${isMobile ? "pb-safe" : ""} ${showBackButton ? "pt-[35px] lg:pt-0" : ""}`}>
        {/* Photos - Show either restaurant photos or community photos */}
        {(photos.length > 0 || (communityStats?.recentPhotos && communityStats.recentPhotos.length > 0)) && (
          <div 
            className={`${isMobile ? 'aspect-video' : 'aspect-video md:h-64'} bg-muted relative overflow-hidden cursor-pointer group`} 
            onClick={() => navigate(`/restaurant/${restaurantData.place_id || restaurantData.id}/community-photos?name=${encodeURIComponent(restaurantData.name)}`)}
          >
            {/* Try to show community photos first, then restaurant photos, then fallback */}
            {communityStats?.recentPhotos?.[0]?.photos?.[0] ? (
              <img 
                src={communityStats.recentPhotos[0].photos[0]} 
                alt={restaurantData.name} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Try the next photo source if community photo fails
                  if (photos.length > 0) {
                    target.src = photos[0];
                  } else {
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSA5LTYgNi02LTYiIHN0cm9rZT0iIzk3YTNiMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                    target.alt = 'Photo unavailable';
                  }
                }}
              />
            ) : photos.length > 0 ? (
              <img 
                src={photos[0]} 
                alt={restaurantData.name} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Im0xNSA5LTYgNi02LTYiIHN0cm9rZT0iIzk3YTNiMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+';
                  target.alt = 'Photo unavailable';
                }}
              />
            ) : null}
            <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md text-sm">
              View more photos
            </div>
            {communityStats?.recentPhotos && communityStats.recentPhotos.length > 0 && photos.length === 0 && (
              <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-md text-sm flex items-center gap-2">
                <User className="h-3 w-3" />
                Shared by {communityStats.recentPhotos[0].username}
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="p-4 space-y-6">
          {/* Shared by info */}
          {restaurantData.isSharedRestaurant && restaurantData.sharedBy && <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Shared by {restaurantData.sharedBy.name}</p>
                    {restaurantData.sharedBy.username && <p className="text-xs text-muted-foreground">@{restaurantData.sharedBy.username}</p>}
                    {restaurantData.isWishlist && <Badge variant="outline" className="mt-1">
                        <Heart className="h-3 w-3 mr-1" />
                        On their wishlist
                      </Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>}

          {/* Restaurant Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">{restaurantData.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm flex items-center gap-1">
                    {restaurantData.cuisine}
                    {(restaurantData.priceRange || restaurantData.price_range) && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span>{getPriceDisplay(restaurantData.priceRange || restaurantData.price_range)}</span>
                      </>
                    )}
                    {isEnhancingWithAI && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                  </Badge>
                  {restaurantData.michelinStars || restaurantData.michelin_stars || isEnhancingWithAI ? <Badge variant="outline" className="text-sm flex items-center gap-1">
                      <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars || 0} readonly={true} size="sm" />
                      {isEnhancingWithAI && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                    </Badge> : null}
                </div>
              </div>
              {restaurantData.rating && restaurantData.isSharedRestaurant && restaurantData.sharedBy && <div className="flex-shrink-0 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-1">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{restaurantData.rating.toFixed(1)}</div>
                      <Star className="h-3 w-3 fill-primary text-primary mx-auto" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {restaurantData.sharedBy.name}'s Rating
                  </p>
                </div>}
            </div>

            {/* Status and Hours */}
            {restaurantData.isOpen !== undefined && <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className={`text-sm font-medium ${restaurantData.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                  {restaurantData.isOpen ? 'Open now' : 'Closed'}
                </span>
              </div>}
          </div>

          

          {/* Community Rating */}
          <CommunityRating stats={communityStats} isLoading={isLoadingReviews} />

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {getPhoneNumber() && <Button onClick={handleCall} className="flex items-center gap-2" variant="default">
                <Phone className="h-4 w-4" />
                Call
              </Button>}
            <Button onClick={handleDirections} className="flex items-center gap-2" variant="default">
              <Navigation className="h-4 w-4" />
              Directions
            </Button>
            {restaurantData.website && <Button onClick={handleWebsite} className="flex items-center gap-2" variant="default">
                <Globe className="h-4 w-4" />
                Website
              </Button>}
          </div>

          {/* Secondary Action Buttons */}
          {canAddToWishlist && <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleAddToWishlist} variant="outline" className="flex items-center gap-2" disabled={isAdding}>
                <Plus className="h-4 w-4" />
                {isAdding ? 'Adding...' : 'Add to List'}
              </Button>
              <Button variant="outline" onClick={handleAddToWishlist} className="flex items-center gap-2" disabled={isAdding}>
                <Heart className="h-4 w-4" />
                {isAdding ? 'Adding...' : 'Wishlist'}
              </Button>
            </div>}

          <Separator />

          {/* Unified Photo Gallery - combines community and friend photos */}
          <UnifiedPhotoGallery stats={communityStats} isLoading={isLoadingReviews} onPhotoClick={() => {}} friendPhotos={restaurantData.isSharedRestaurant && restaurantData.photos && restaurantData.photos.length > 0 ? restaurantData.photos.map((url, index) => ({
            url,
            caption: Array.isArray(restaurantData.photoCaptions) ? restaurantData.photoCaptions[index] : '',
            dishName: Array.isArray(restaurantData.photo_captions) ? restaurantData.photo_captions[index] : ''
          })) : undefined} friendName={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.name : undefined} friendId={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.id : undefined} restaurantId={restaurantData.id} restaurantPlaceId={restaurantData.place_id} />

          {/* Details */}
          <div className="space-y-4">
            
            
            {/* Address */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Address</p>
                    <p className="text-sm text-muted-foreground">{restaurantData.address}</p>
                    {restaurantData.city && <p className="text-sm text-muted-foreground">{restaurantData.city}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            {(getPhoneNumber() || restaurantData.website) && <Card>
                
              </Card>}

            {/* Opening Hours */}
            {getOpeningHours() && <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Hours</h3>
                  <OpeningHoursDisplay hours={getOpeningHours()!} />
                </CardContent>
              </Card>}

            {/* Notes */}
            {restaurantData.notes && <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {restaurantData.notes}
                  </p>
                </CardContent>
              </Card>}

            {/* Friend's Photos - only show for shared restaurants */}
            {/* This section is now handled by UnifiedPhotoGallery above */}
          </div>

            <Separator />

            {/* Map */}
            {restaurantData.latitude && restaurantData.longitude && <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Location</h3>
                  <div className="h-48 rounded-md overflow-hidden">
                    <RestaurantLocationMap latitude={restaurantData.latitude} longitude={restaurantData.longitude} name={restaurantData.name} address={restaurantData.address} />
                  </div>
                </CardContent>
              </Card>}
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery photos={photos} photoCaptions={restaurantData.photoCaptions || restaurantData.photo_captions} isOpen={isPhotoGalleryOpen} onClose={() => setIsPhotoGalleryOpen(false)} restaurantName={restaurantData.name} isMobile={actualIsMobile} />

    </>;
}
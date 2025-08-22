import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, Heart, Plus, Share2, Navigation, ExternalLink, Check, User, Users, Award } from 'lucide-react';
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
import { useRatingStats } from '@/hooks/useRatingStats';
import { resolveImageUrl } from '@/utils/imageUtils';
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
  const [deferHeavy, setDeferHeavy] = useState(false);
  const [deferCommunity, setDeferCommunity] = useState(false);
  const [deferPhotos, setDeferPhotos] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hasLoadedHeroImage, setHasLoadedHeroImage] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const enhancedPlaceIdsRef = useRef<Set<string>>(new Set());
  const linkedPlaceIdsRef = useRef<Set<string>>(new Set());
  const fetchedDetailsPlaceIdsRef = useRef<Set<string>>(new Set());
  const preloadedStatsPlaceIdsRef = useRef<Set<string>>(new Set());
  const hasValidPlaceId = useMemo(() => !!restaurant.place_id, [restaurant.place_id]);
  useEffect(() => {
    const schedule = (cb: () => void, delay = 0) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, {
          timeout: delay + 100
        });
      } else {
        setTimeout(cb, delay);
      }
    };
    
    // Immediate: Show basic content
    // After 50ms: Load community data
    schedule(() => setDeferCommunity(true), 50);
    
    // After 100ms: Load photos 
    schedule(() => setDeferPhotos(true), 100);
    
    // After 200ms: Load heavy features
    schedule(() => setDeferHeavy(true), 200);
  }, []);
  useEffect(() => {
    // Show map immediately when coordinates are available
    if (restaurantData.latitude && restaurantData.longitude) {
      setShowMap(true);
    }
  }, [restaurantData.latitude, restaurantData.longitude]);
  const {
    communityStats,
    reviews,
    isLoading: isLoadingReviews,
    submitReview
  } = useRestaurantReviews(deferCommunity && hasValidPlaceId ? restaurantData.place_id : undefined, restaurantData.name);
  const {
    friendStats,
    expertStats,
    loading: isLoadingStats
  } = useRatingStats(deferCommunity && hasValidPlaceId ? restaurantData.place_id : undefined, restaurantData.name);

  // Build hero image candidates: community photos first, then restaurant photos
  const heroCandidates = useMemo(() => {
    const community = (communityStats?.recentPhotos || []).flatMap((rp: any) => rp?.photos || []);
    const own = photos || [];
    return [...community, ...own].filter((p: any) => typeof p === 'string' && p.trim() !== '');
  }, [communityStats?.recentPhotos, photos]);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    setHeroIndex(0);
  }, [heroCandidates.length]);
  const heroSrc = heroCandidates[heroIndex];
  const hasHeroPhoto = !!heroSrc;
  useEffect(() => {
    console.log('Hero candidates', {
      placeId: restaurantData.place_id,
      communityCount: communityStats?.recentPhotos?.length,
      photosCount: photos.length,
      heroCount: heroCandidates.length,
      first: heroCandidates[0]
    });
  }, [heroCandidates.length]);

  // Save community stats to context for preloading (once per place)
  useEffect(() => {
    if (communityStats && restaurantData.place_id && !preloadedStatsPlaceIdsRef.current.has(restaurantData.place_id)) {
      setPreloadedStats(restaurantData.place_id, communityStats);
      preloadedStatsPlaceIdsRef.current.add(restaurantData.place_id);
    }
  }, [communityStats, restaurantData.place_id, setPreloadedStats]);
  useEffect(() => {
    setRestaurantData(restaurant);
    setPhotos(restaurant.photos || []);

    // Fetch additional details if we have a place_id and missing info (deferred)
    if (deferHeavy && restaurant.place_id && !restaurant.website && !(restaurant.formatted_phone_number || restaurant.phone || restaurant.phone_number) && !fetchedDetailsPlaceIdsRef.current.has(restaurant.place_id)) {
      fetchedDetailsPlaceIdsRef.current.add(restaurant.place_id);
      fetchPlaceDetails(restaurant.place_id);
    }

    // Enhance with AI if cuisine is generic or Michelin stars are unknown (deferred)
    if (deferHeavy && restaurant.place_id && shouldEnhanceWithAI(restaurant) && !enhancedPlaceIdsRef.current.has(restaurant.place_id)) {
      enhancedPlaceIdsRef.current.add(restaurant.place_id);
      enhanceWithAI(restaurant);
    }
  }, [restaurant, deferHeavy]);

  // Ensure historical ratings are linked to this Google Place ID (helps stats show up)
  useEffect(() => {
    if (!restaurantData?.place_id || !restaurantData?.name) return;
    const link = async () => {
      try {
        await supabase.rpc('link_restaurant_by_place_id', {
          place_id_param: restaurantData.place_id!,
          restaurant_name_param: restaurantData.name
        });
      } catch (e) {
        console.warn('link_restaurant_by_place_id failed (non-blocking):', e);
      }
    };
    link();
  }, [restaurantData?.place_id, restaurantData?.name]);
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
        google_place_id: restaurantData.place_id,
        // ensure friend/expert stats can link
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
        <div className="min-h-screen bg-background">
        {/* Header */}
        {showBackButton && <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-safe-area-top">
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
      <div className="min-h-screen bg-background text-foreground">
        {/* Edge-to-edge Hero Image with Overlay */}
        {hasHeroPhoto && (
          <div className="relative w-full h-80 overflow-hidden">
            <img
              src={resolveImageUrl(heroSrc)}
              alt={restaurantData.name}
              className="w-full h-full object-cover"
              onLoad={() => setHasLoadedHeroImage(true)}
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
            
            {/* Header controls overlaid on image */}
            <div className="absolute top-0 left-0 right-0 z-50 pt-safe-area-top">
              <div className="flex items-center justify-between p-4">
                {showBackButton && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBack} 
                    className="h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white border-0 backdrop-blur-sm"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-10 w-10 p-0 bg-black/20 hover:bg-black/40 text-white border-0 backdrop-blur-sm"
                  aria-label="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Restaurant info overlaid on image */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-5 text-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold leading-tight mb-2">{restaurantData.name}</h1>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm opacity-90">{restaurantData.cuisine}</span>
                      {(restaurantData.priceRange || restaurantData.price_range) && (
                        <span className="text-sm opacity-90">
                          {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range)}
                        </span>
                      )}
                    </div>
                  </div>
                  {(restaurantData.michelinStars || restaurantData.michelin_stars) && (
                    <div className="ml-3">
                      <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars || 0} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No hero image fallback header */}
        {!hasHeroPhoto && showBackButton && (
          <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-10 w-10 p-0 touch-manipulation" aria-label="Go back">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-lg font-semibold">{restaurantData.name}</h1>
                  <p className="text-sm text-muted-foreground">{restaurantData.cuisine}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleShare} className="h-10 w-10 p-0" aria-label="Share">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="px-4 py-6 space-y-8">
          {/* Restaurant info for no hero image */}
          {!hasHeroPhoto && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold">{restaurantData.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-muted-foreground">{restaurantData.cuisine}</span>
                  {(restaurantData.priceRange || restaurantData.price_range) && (
                    <span className="text-muted-foreground">
                      {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range)}
                    </span>
                  )}
                  {(restaurantData.michelinStars || restaurantData.michelin_stars) && (
                    <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars || 0} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Premium Action Buttons */}
          <div className="space-y-4">
            {/* Primary Actions */}
            <div className="grid grid-cols-3 gap-3">
              {getPhoneNumber() && (
                <Button
                  onClick={handleCall}
                  className="h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-lg"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              <Button
                onClick={handleDirections}
                className="h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-lg"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Directions
              </Button>
              {restaurantData.website && (
                <Button
                  onClick={handleWebsite}
                  className="h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-medium shadow-lg"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                </Button>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-3 justify-center">
              {canAddToWishlist && user && (
                <Button
                  onClick={handleAddToWishlist}
                  disabled={isAdding}
                  variant="outline"
                  className="h-10 rounded-full px-6 border-accent text-accent hover:bg-accent/10"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  {isAdding ? 'Adding...' : 'Add to List'}
                </Button>
              )}
              <Button
                variant="outline"
                className="h-10 rounded-full px-6 border-accent text-accent hover:bg-accent/10"
              >
                <Plus className="h-4 w-4 mr-2" />
                Wishlist
              </Button>
            </div>
          </div>

          {/* Community Rating Section */}
          {deferCommunity && (communityStats || friendStats || expertStats) && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-1">COMMUNITY RATING</h2>
                <p className="text-sm text-muted-foreground">Based on friend and expert reviews</p>
              </div>

              {/* Circular Community Score */}
              {communityStats?.averageRating && (
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-accent/20 border-4 border-accent flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent">
                        {communityStats.averageRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {communityStats.totalReviews} reviews
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Rating Distribution */}
              {communityStats?.ratingDistribution && (
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = communityStats.ratingDistribution[star] || 0;
                    const percentage = communityStats.totalReviews > 0 
                      ? (count / communityStats.totalReviews) * 100 
                      : 0;
                    
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-12">
                          <span className="text-sm font-medium">{star}</span>
                          <Star className="h-3 w-3 fill-accent text-accent" />
                        </div>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <Separator className="my-6" />

              {/* Friends & Experts Stats */}
              <div className="grid grid-cols-2 gap-6">
                {friendStats && friendStats.count > 0 && (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Users className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-accent">FRIENDS</span>
                    </div>
                    <div className="text-2xl font-bold">{friendStats.avg?.toFixed(1) || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {friendStats.count || 0} ratings
                    </div>
                  </div>
                )}
                {expertStats && expertStats.count > 0 && (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Award className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-accent">EXPERTS</span>
                    </div>
                    <div className="text-2xl font-bold">{expertStats.avg?.toFixed(1) || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">
                      {expertStats.count || 0} ratings
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Unified Photo Gallery */}
          {deferPhotos && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">PHOTOS & DISHES</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPhotoGalleryOpen(true)}
                  className="rounded-full px-4 border-accent text-accent hover:bg-accent/10 shadow-md"
                >
                  View All
                </Button>
              </div>
              
              <UnifiedPhotoGallery 
                stats={communityStats}
                isLoading={isLoadingReviews}
                restaurantPlaceId={restaurantData.place_id}
                restaurantName={restaurantData.name}
              />
            </div>
          )}

          {/* Restaurant Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">DETAILS</h2>
            
            {/* Address */}
            <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
              <MapPin className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{restaurantData.address}</p>
                {restaurantData.city && (
                  <p className="text-sm text-muted-foreground">{restaurantData.city}</p>
                )}
              </div>
            </div>

            {/* Opening Hours */}
            {getOpeningHours() && (
              <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                <Clock className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-2">Hours</p>
                  <OpeningHoursDisplay 
                    hours={getOpeningHours()} 
                    className="text-sm space-y-1"
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            {getPhoneNumber() && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <Phone className="h-5 w-5 text-accent flex-shrink-0" />
                <p className="font-medium">{getPhoneNumber()}</p>
              </div>
            )}
          </div>

          {/* Map */}
          {showMap && deferHeavy && restaurantData.latitude && restaurantData.longitude && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">LOCATION</h2>
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <RestaurantLocationMap
                  latitude={restaurantData.latitude}
                  longitude={restaurantData.longitude}
                  name={restaurantData.name}
                  address={restaurantData.address}
                />
              </div>
            </div>
          )}

          {/* Sticky Reserve Button */}
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="h-14 px-8 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold shadow-2xl"
            >
              Reserve Table
            </Button>
          </div>
        </div>
      </div>
    </>;
  }
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
  const { user } = useAuth();
  const { setPreloadedStats } = useCommunityData();
  const actualIsMobile = useIsMobile();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [restaurantData, setRestaurantData] = useState(restaurant);
  const [isAdding, setIsAdding] = useState(false);
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [deferHeavy, setDeferHeavy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hasLoadedHeroImage, setHasLoadedHeroImage] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const enhancedPlaceIdsRef = useRef<Set<string>>(new Set());
  const linkedPlaceIdsRef = useRef<Set<string>>(new Set());
  const fetchedDetailsPlaceIdsRef = useRef<Set<string>>(new Set());
  const preloadedStatsPlaceIdsRef = useRef<Set<string>>(new Set());
  const hasValidPlaceId = useMemo(() => !!restaurant.place_id, [restaurant.place_id]);

  useEffect(() => {
    const schedule = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: 800 });
      } else {
        setTimeout(cb, 200);
      }
    };
    schedule(() => setDeferHeavy(true));
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
  } = useRestaurantReviews(hasValidPlaceId ? restaurantData.place_id : undefined, restaurantData.name);

  const { friendStats, expertStats, loading: isLoadingStats } = useRatingStats(hasValidPlaceId ? restaurantData.place_id : undefined, restaurantData.name);
  
  // Build hero image candidates: community photos first, then restaurant photos
  const heroCandidates = useMemo(() => {
    const community = (communityStats?.recentPhotos || []).flatMap((rp: any) => rp?.photos || []);
    const own = photos || [];
    return [...community, ...own].filter((p: any) => typeof p === 'string' && p.trim() !== '');
  }, [communityStats?.recentPhotos, photos]);
  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => { setHeroIndex(0); }, [heroCandidates.length]);
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
    if (
      deferHeavy &&
      restaurant.place_id &&
      (!restaurant.website && !(restaurant.formatted_phone_number || restaurant.phone || restaurant.phone_number)) &&
      !fetchedDetailsPlaceIdsRef.current.has(restaurant.place_id)
    ) {
      fetchedDetailsPlaceIdsRef.current.add(restaurant.place_id);
      fetchPlaceDetails(restaurant.place_id);
    }

    // Enhance with AI if cuisine is generic or Michelin stars are unknown (deferred)
    if (
      deferHeavy &&
      restaurant.place_id &&
      shouldEnhanceWithAI(restaurant) &&
      !enhancedPlaceIdsRef.current.has(restaurant.place_id)
    ) {
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
          restaurant_name_param: restaurantData.name,
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
        google_place_id: restaurantData.place_id, // ensure friend/expert stats can link
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
      <div className="min-h-screen bg-background">
      {/* Header */}
      {showBackButton && <div className="sticky top-0 z-50 bg-background backdrop-blur border-b pt-safe-area-top">
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

      <div className={`${isMobile ? "pb-safe" : ""}`}>
        {/* Photos - Show either restaurant photos or community photos */}
        {hasHeroPhoto && (
          <div 
            className={`${isMobile ? 'aspect-video' : 'aspect-video md:aspect-auto md:h-auto md:max-h-[420px] md:max-w-3xl md:mx-auto'} w-full bg-muted relative overflow-hidden cursor-pointer group`} 
            onClick={() => navigate(`/restaurant/${restaurantData.place_id || restaurantData.id}/community-photos?name=${encodeURIComponent(restaurantData.name)}`)}
          >
            {/* Try to show community photos first, then restaurant photos, then fallback */}
            {/* Mobile: single hero image */}
            <div className="md:hidden w-full h-full">
              {heroSrc ? (
                <img
                  src={resolveImageUrl(heroSrc)}
                  alt={restaurantData.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy" decoding="async"
                  onLoad={() => setHasLoadedHeroImage(true)}
                  onError={() => setHeroIndex((i) => i + 1)}
                />
              ) : null}
            </div>

            {/* Desktop: grid collage when multiple photos available, otherwise single image (contain) */}
            <div className="hidden md:block w-full h-full">
              {(() => {
                const header: string[] = (communityStats?.recentPhotos?.length
                  ? communityStats.recentPhotos.flatMap((rp: any) => rp?.photos || [])
                  : photos).slice(0, 6);
                if (header.length > 1) {
                  return (
                    <div className="grid grid-cols-3 gap-2 auto-rows-[140px]">
                      {header.map((src, i) => (
                        <img
                          key={i}
                          src={resolveImageUrl(src)}
                          alt={`${restaurantData.name} photo ${i + 1}`}
                          className="w-full h-full object-cover rounded-md"
                          onLoad={() => setHasLoadedHeroImage(true)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ))}
                    </div>
                  );
                }
                // Single image fallback on desktop
                if (communityStats?.recentPhotos?.[0]?.photos?.[0]) {
                  return (
                    <img
                      src={resolveImageUrl(communityStats.recentPhotos[0].photos[0])}
                      alt={restaurantData.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 md:object-contain md:h-auto md:w-auto md:max-h-[420px] md:mx-auto"
                      onLoad={() => setHasLoadedHeroImage(true)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  );
                }
                if (photos.length > 0) {
                  return (
                    <img
                      src={resolveImageUrl(photos[0])}
                      alt={restaurantData.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 md:object-contain md:h-auto md:w-auto md:max-h-[420px] md:mx-auto"
                       onError={(e) => {
                         const target = e.target as HTMLImageElement;
                         target.style.display = 'none';
                       }}
                    />
                  );
                }
                return null;
              })()}
            </div>
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
        <div className="space-y-6">{/* Remove p-4 padding to make content stretch edge-to-edge */}
          {/* Shared by info */}
          {restaurantData.isSharedRestaurant && restaurantData.sharedBy && <div className="border-primary/20 bg-primary/5 p-4">
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
            </div>}

          {/* Restaurant Header */}
          <div className="space-y-3 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">{restaurantData.name}</h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-sm flex items-center gap-1">
                    {restaurantData.cuisine}
                    {/* Debug: Always show price range section */}
                    <span className="text-muted-foreground">•</span>
                    <span>
                      {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range) || '$$'}
                    </span>
                    {isEnhancingWithAI && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                  </Badge>
                   {(restaurantData.michelinStars > 0 || restaurantData.michelin_stars > 0 || isEnhancingWithAI) && (
                     <Badge variant="outline" className="text-sm flex items-center gap-1">
                       <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars || 0} readonly={true} size="sm" />
                       {isEnhancingWithAI && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
                     </Badge>
                   )}
                </div>
              </div>
              {restaurantData.rating && restaurantData.isSharedRestaurant && restaurantData.sharedBy && <div className="flex-shrink-0 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-1 mx-auto">
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

          

          {/* Ratings Summary: Friends and Experts */}
          {restaurantData.place_id && (
            <div className="py-3 px-4 border-b border-border/50">
              <div className="grid grid-cols-2 gap-3">
                {/* Friends Rating */}
                <div 
                  onClick={() => navigate(`/restaurant/${restaurantData.place_id}/friends-ratings?name=${encodeURIComponent(restaurantData.name)}`)} 
                  className="cursor-pointer group"
                >
                  <div className="flex flex-col items-center text-center py-2 transition-all duration-200 group-hover:scale-105">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-muted-foreground">Friends</span>
                    </div>
                    <div className="text-xl font-bold text-foreground mb-0.5">
                      {isLoadingStats ? '—' : (friendStats.avg ? `${friendStats.avg}/10` : '—')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isLoadingStats ? 'Loading…' : `${friendStats.count} reviews`}
                    </div>
                  </div>
                </div>
                
                {/* Expert Rating */}
                <div 
                  onClick={() => navigate(`/restaurant/${restaurantData.place_id}/expert-ratings?name=${encodeURIComponent(restaurantData.name)}`)} 
                  className="cursor-pointer group"
                >
                  <div className="flex flex-col items-center text-center py-2 transition-all duration-200 group-hover:scale-105">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Award className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-muted-foreground">Experts</span>
                    </div>
                    <div className="text-xl font-bold text-foreground mb-0.5">
                      {isLoadingStats ? '—' : (expertStats.avg ? `${expertStats.avg}/10` : '—')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isLoadingStats ? 'Loading…' : `${expertStats.count} reviews`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Community Rating */}
          {deferHeavy && (
            <CommunityRating stats={communityStats} isLoading={isLoadingReviews} />
          )}

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-3 gap-3 px-4">
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
          {canAddToWishlist && <div className="grid grid-cols-2 gap-3 px-4">
              <Button onClick={handleAddToWishlist} variant="outline" className="flex items-center gap-2" disabled={isAdding}>
                <Plus className="h-4 w-4" />
                {isAdding ? 'Adding...' : 'Add to List'}
              </Button>
              <Button variant="outline" onClick={handleAddToWishlist} className="flex items-center gap-2" disabled={isAdding}>
                <Heart className="h-4 w-4" />
                {isAdding ? 'Adding...' : 'Wishlist'}
              </Button>
            </div>}

          <div className="h-px bg-border mx-4" />

          {/* Unified Photo Gallery - combines community and friend photos */}
          {deferHeavy && (
            <UnifiedPhotoGallery stats={communityStats} isLoading={isLoadingReviews} onPhotoClick={() => {}} friendPhotos={restaurantData.isSharedRestaurant && restaurantData.photos && restaurantData.photos.length > 0 ? restaurantData.photos.map((url, index) => ({
              url,
              caption: Array.isArray(restaurantData.photoCaptions) ? restaurantData.photoCaptions[index] : '',
              dishName: Array.isArray(restaurantData.photo_captions) ? restaurantData.photo_captions[index] : ''
            })) : undefined} friendName={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.name : undefined} friendId={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.id : undefined} restaurantId={restaurantData.id} restaurantPlaceId={restaurantData.place_id} />
          )}

          {/* Details */}
          <div className="space-y-0">
            {/* Address */}
            <div className="p-4 border-b border-border/20">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{restaurantData.address}</p>
                  {restaurantData.city && <p className="text-sm text-muted-foreground">{restaurantData.city}</p>}
                </div>
              </div>
            </div>

            {/* Opening Hours */}
            {getOpeningHours() && <div className="border-b border-border/20">
                <OpeningHoursDisplay hours={getOpeningHours()!} className="px-4" />
              </div>}

            {/* Notes */}
            {restaurantData.notes && <div className="p-4 border-b border-border/20">
                <h3 className="font-medium mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {restaurantData.notes}
                </p>
              </div>}

            {/* Map */}
            {restaurantData.latitude && restaurantData.longitude && <div className="p-4">
                <h3 className="font-medium mb-3">Location</h3>
                <div ref={mapRef} className="h-48 rounded-md overflow-hidden">
                  {showMap && (
                    <RestaurantLocationMap latitude={restaurantData.latitude} longitude={restaurantData.longitude} name={restaurantData.name} address={restaurantData.address} />
                  )}
                </div>
              </div>}
          </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery photos={photos.map((p) => resolveImageUrl(p))} photoCaptions={restaurantData.photoCaptions || restaurantData.photo_captions} isOpen={isPhotoGalleryOpen} onClose={() => setIsPhotoGalleryOpen(false)} restaurantName={restaurantData.name} isMobile={actualIsMobile} />

    </>;
}
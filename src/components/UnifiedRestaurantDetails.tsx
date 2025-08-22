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
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        {showBackButton && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pt-safe-area-top">
            <div className="flex items-center gap-4 p-4">
              <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
        )}
        
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

  return (
    <>
      <div className="min-h-screen bg-background pb-20">
        {/* Hero Section with Full-Width Carousel */}
        {deferPhotos && hasHeroPhoto && (
          <div className="relative h-[50vh] w-full bg-muted overflow-hidden">
            {/* Carousel Container */}
            <div className="relative w-full h-full">
              {heroCandidates.length > 0 && (
                <img 
                  src={resolveImageUrl(heroSrc)} 
                  alt={restaurantData.name} 
                  className="w-full h-full object-cover"
                  loading="lazy" 
                  decoding="async" 
                  onLoad={() => setHasLoadedHeroImage(true)} 
                  onError={() => setHeroIndex(i => (i + 1) % heroCandidates.length)} 
                />
              )}
              
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              {/* Floating Action Buttons */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                {showBackButton && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleBack} 
                    className="h-10 w-10 p-0 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
                  >
                    <ArrowLeft className="h-4 w-4 text-white" />
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleShare} 
                  className="h-10 w-10 p-0 bg-white/20 backdrop-blur-sm border-white/30 hover:bg-white/30"
                >
                  <Share2 className="h-4 w-4 text-white" />
                </Button>
              </div>

              {/* Restaurant Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h1 className="text-3xl font-bold mb-3 leading-tight">{restaurantData.name}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Cuisine Chip */}
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/30">
                    <span className="text-sm font-medium">{restaurantData.cuisine}</span>
                  </div>
                  
                  {/* Price Range Chip */}
                  {(restaurantData.priceRange || restaurantData.price_range) && (
                    <div className="bg-green-500/20 backdrop-blur-sm px-3 py-1.5 rounded-full border border-green-400/30">
                      <span className="text-sm font-medium text-green-100">
                        {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range)}
                      </span>
                    </div>
                  )}
                  
                  {/* Michelin Stars Badge */}
                  {(restaurantData.michelinStars > 0 || restaurantData.michelin_stars > 0) && (
                    <div className="bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-red-500/50">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-white">
                          {restaurantData.michelinStars || restaurantData.michelin_stars} Michelin
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                {restaurantData.isOpen !== undefined && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${restaurantData.isOpen ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm font-medium">
                      {restaurantData.isOpen ? 'Open now' : 'Closed'}
                    </span>
                  </div>
                )}
              </div>

              {/* Carousel indicators */}
              {heroCandidates.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-1">
                  {heroCandidates.slice(0, 5).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setHeroIndex(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === heroIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-8 px-4 pt-6">
          {/* Shared by info */}
          {restaurantData.isSharedRestaurant && restaurantData.sharedBy && (
            <Card className="mx-4 bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Shared by {restaurantData.sharedBy.name}</p>
                    {restaurantData.sharedBy.username && <p className="text-xs text-muted-foreground">@{restaurantData.sharedBy.username}</p>}
                    {restaurantData.isWishlist && (
                      <Badge variant="outline" className="mt-1">
                        <Heart className="h-3 w-3 mr-1" />
                        On their wishlist
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ratings Summary Card */}
          {deferCommunity && restaurantData.place_id && (
            <Card className="mx-4">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Reviews & Ratings</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Community Rating - Center spotlight */}
                  <div className="col-span-1 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-green-500/30 flex items-center justify-center mb-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">
                          {communityStats?.averageRating ? communityStats.averageRating.toFixed(1) : '—'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground text-center">Community</span>
                    <span className="text-xs text-muted-foreground">{communityStats?.totalReviews || 0} reviews</span>
                  </div>
                  
                  {/* Friends Rating */}
                  <div 
                    onClick={() => navigate(`/restaurant/${restaurantData.place_id}/friends-ratings?name=${encodeURIComponent(restaurantData.name)}`)} 
                    className="cursor-pointer group col-span-1 flex flex-col items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-2">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="text-xl font-bold text-foreground mb-1">
                      {isLoadingStats ? '—' : friendStats.avg ? `${friendStats.avg}/10` : '—'}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground text-center">Friends</span>
                    <span className="text-xs text-muted-foreground">{friendStats.count} reviews</span>
                  </div>
                  
                  {/* Expert Rating */}
                  <div 
                    onClick={() => navigate(`/restaurant/${restaurantData.place_id}/expert-ratings?name=${encodeURIComponent(restaurantData.name)}`)} 
                    className="cursor-pointer group col-span-1 flex flex-col items-center p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-1 mb-2">
                      <Award className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="text-xl font-bold text-foreground mb-1">
                      {isLoadingStats ? '—' : expertStats.avg ? `${expertStats.avg}/10` : '—'}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground text-center">Experts</span>
                    <span className="text-xs text-muted-foreground">{expertStats.count} reviews</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Secondary Action Buttons */}
          {canAddToWishlist && (
            <div className="flex gap-3 px-4">
              <Button 
                onClick={handleAddToWishlist} 
                variant="outline" 
                className="flex-1 rounded-full py-3 h-auto" 
                disabled={isAdding}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAdding ? 'Adding...' : 'Add to List'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleAddToWishlist} 
                className="flex-1 rounded-full py-3 h-auto" 
                disabled={isAdding}
              >
                <Heart className="h-4 w-4 mr-2" />
                {isAdding ? 'Adding...' : 'Wishlist'}
              </Button>
            </div>
          )}

          {/* Community Rating Details */}
          {deferCommunity && <CommunityRating stats={communityStats} isLoading={isLoadingReviews} />}

          {/* Photo Gallery */}
          {deferPhotos && <UnifiedPhotoGallery stats={communityStats} isLoading={isLoadingReviews} onPhotoClick={() => {}} friendPhotos={restaurantData.isSharedRestaurant && restaurantData.photos && restaurantData.photos.length > 0 ? restaurantData.photos.map((url, index) => ({
            url,
            caption: Array.isArray(restaurantData.photoCaptions) ? restaurantData.photoCaptions[index] : '',
            dishName: Array.isArray(restaurantData.photo_captions) ? restaurantData.photo_captions[index] : ''
          })) : undefined} friendName={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.name : undefined} friendId={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.id : undefined} restaurantId={restaurantData.id} restaurantPlaceId={restaurantData.place_id} restaurantName={restaurantData.name} />}

          {/* Restaurant Details Card */}
          <Card className="mx-4">
            <CardContent className="p-0">
              {/* Address */}
              <div className="p-6 border-b border-border/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-1">Address</h4>
                    <p className="font-medium">{restaurantData.address}</p>
                    {restaurantData.city && <p className="text-sm text-muted-foreground">{restaurantData.city}</p>}
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full">
                    Copy
                  </Button>
                </div>
              </div>

              {/* Opening Hours */}
              {getOpeningHours() && (
                <div className="p-6 border-b border-border/10">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-1">Hours</h4>
                      {restaurantData.isOpen !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${restaurantData.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={`text-sm font-medium ${restaurantData.isOpen ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                            {restaurantData.isOpen ? 'Open Now' : 'Closed'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <OpeningHoursDisplay hours={getOpeningHours()!} className="ml-14" />
                </div>
              )}

              {/* Notes */}
              {restaurantData.notes && (
                <div className="p-6 border-b border-border/10">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2">Notes</h4>
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {restaurantData.notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Map */}
              {restaurantData.latitude && restaurantData.longitude && (
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Location</h4>
                  </div>
                  <div ref={mapRef} className="h-48 rounded-xl overflow-hidden shadow-sm border border-border/10">
                    {showMap && <RestaurantLocationMap latitude={restaurantData.latitude} longitude={restaurantData.longitude} name={restaurantData.name} address={restaurantData.address} />}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/20 p-4 safe-area-bottom">
          <div className="flex gap-3 max-w-md mx-auto">
            {getPhoneNumber() && (
              <Button 
                onClick={handleCall} 
                className="flex-1 rounded-full py-3 h-auto shadow-lg" 
                variant="default"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button 
              onClick={handleDirections} 
              className="flex-1 rounded-full py-3 h-auto shadow-lg" 
              variant="default"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Directions
            </Button>
            {restaurantData.website && (
              <Button 
                onClick={handleWebsite} 
                className="flex-1 rounded-full py-3 h-auto shadow-lg" 
                variant="default"
              >
                <Globe className="h-4 w-4 mr-2" />
                Website
              </Button>
            )}
          </div>
          
          {/* Reserve Button */}
          <div className="mt-3 max-w-md mx-auto">
            <Button 
              className="w-full rounded-full py-4 h-auto text-base font-semibold shadow-lg bg-primary hover:bg-primary/90"
              onClick={() => toast.success('Reservation feature coming soon!')}
            >
              Reserve a Table
            </Button>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <PhotoGallery 
        photos={photos.map(p => resolveImageUrl(p))} 
        photoCaptions={restaurantData.photoCaptions || restaurantData.photo_captions} 
        isOpen={isPhotoGalleryOpen} 
        onClose={() => setIsPhotoGalleryOpen(false)} 
        restaurantName={restaurantData.name} 
        isMobile={actualIsMobile} 
      />
    </>
  );
}
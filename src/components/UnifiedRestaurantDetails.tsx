import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, Heart, Plus, Share2, Navigation, ExternalLink, Check, User, Users, Award, Camera, Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
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
  const [deferCommunity, setDeferCommunity] = useState(false);
  const [deferPhotos, setDeferPhotos] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [hasLoadedHeroImage, setHasLoadedHeroImage] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showHoursExpanded, setShowHoursExpanded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
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

  // Scroll handler for sticky bar
  useEffect(() => {
    if (!heroRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(heroRef.current);
    return () => observer.disconnect();
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
      const { data, error } = await supabase.functions.invoke('google-places-search', {
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
      const { error } = await supabase.from('restaurants').insert({
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

  const copyAddress = () => {
    const fullAddress = `${restaurantData.address}, ${restaurantData.city || ''}`.trim();
    navigator.clipboard.writeText(fullAddress);
    toast.success('Address copied to clipboard!');
  };

  const getStatusBadge = () => {
    if (restaurantData.isOpen !== undefined) {
      return restaurantData.isOpen ? 
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Open</Badge> :
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Closed</Badge>;
    }
    return null;
  };

  const getCurrentHours = () => {
    const hours = getOpeningHours();
    if (!hours || !Array.isArray(hours)) return 'Hours not available';
    
    const today = new Date().getDay();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayHours = hours.find(h => h.includes(dayNames[today]));
    
    if (todayHours) {
      return todayHours.split(': ')[1] || 'Closed';
    }
    return 'Hours not available';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-[280px] bg-muted animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Image Carousel */}
      <div ref={heroRef} className="relative w-full h-[280px] overflow-hidden">
        {hasHeroPhoto ? (
          <Carousel className="w-full h-full">
            <CarouselContent>
              {heroCandidates.map((photo, index) => (
                <CarouselItem key={index} className="w-full h-full p-0">
                  <div className="relative w-full h-full">
                    <img
                      src={resolveImageUrl(photo)}
                      alt={`${restaurantData.name} photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {heroCandidates.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                {heroCandidates.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === heroIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </Carousel>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted via-muted to-muted/50 flex items-center justify-center">
            <Camera className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Floating Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          {showBackButton && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleBack}
              className="h-10 w-10 bg-black/20 hover:bg-black/40 border-0 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </Button>
          )}
          
          <div className="flex gap-2">
            {heroCandidates.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPhotoGalleryOpen(true)}
                className="bg-black/20 hover:bg-black/40 border-0 backdrop-blur-sm text-white text-xs h-8 px-3"
              >
                <Camera className="h-3 w-3 mr-1" />
                View photos ({heroCandidates.length})
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={handleShare}
              className="h-10 w-10 bg-black/20 hover:bg-black/40 border-0 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
        
        {/* Restaurant Name Overlay */}
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
            {restaurantData.name}
          </h1>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="px-4 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-muted text-foreground">{restaurantData.cuisine}</Badge>
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range) || '$$'}
          </Badge>
          {(restaurantData.michelinStars || restaurantData.michelin_stars) ? (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 flex items-center gap-1">
              {Array.from({ length: restaurantData.michelinStars || restaurantData.michelin_stars || 0 }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-current" />
              ))}
            </Badge>
          ) : null}
        </div>

        {/* Social/Ratings Row */}
        {deferCommunity && restaurantData.place_id && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/restaurant/${restaurantData.place_id}/friends-ratings?name=${encodeURIComponent(restaurantData.name)}`)}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Friends</span>
                </div>
                <div className="text-lg font-bold">
                  {isLoadingStats ? '—' : friendStats.count || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {friendStats.count === 0 ? 'Be the first to review' : 'reviews'}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/restaurant/${restaurantData.place_id}/expert-ratings?name=${encodeURIComponent(restaurantData.name)}`)}>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Experts</span>
                </div>
                <div className="text-lg font-bold">
                  {isLoadingStats ? '—' : expertStats.count || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {expertStats.count === 0 ? 'Be the first to review' : 'reviews'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={handleAddToWishlist} className="flex items-center gap-2" disabled={isAdding}>
            <Plus className="h-4 w-4" />
            {isAdding ? 'Adding...' : 'Add to List'}
          </Button>
          <Button variant="outline" onClick={handleAddToWishlist} className="flex items-center gap-2" disabled={isAdding}>
            <Heart className="h-4 w-4" />
            {isAdding ? 'Adding...' : 'Wishlist'}
          </Button>
        </div>
      </div>

      {/* Community Rating */}
      {deferCommunity && communityStats && (
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Community Rating</h3>
            <Button variant="ghost" size="sm">
              {communityStats.totalReviews || 0} reviews
            </Button>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Overall Rating Circle */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {communityStats.averageRating ? communityStats.averageRating.toFixed(1) : '—'}
                  </div>
                  <Star className="h-4 w-4 fill-primary text-primary mx-auto mt-1" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">out of 10</div>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs w-8">{rating * 2 - 1}-{rating * 2}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ 
                        width: `${(communityStats.ratingDistribution?.[rating] || 0) / (communityStats.totalReviews || 1) * 100}%`,
                        opacity: 1 - (rating - 1) * 0.2 
                      }}
                    />
                  </div>
                  <span className="text-xs w-6 text-right text-muted-foreground">
                    {communityStats.ratingDistribution?.[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photos Section */}
      {deferPhotos && heroCandidates.length > 0 && (
        <div className="px-4 py-6">
          <h3 className="text-lg font-semibold mb-4">Photos</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {heroCandidates.slice(0, 6).map((photo, index) => (
              <div key={index} className="relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                <img
                  src={resolveImageUrl(photo)}
                  alt={`${restaurantData.name} photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => setIsPhotoGalleryOpen(true)}>
            <Camera className="h-4 w-4 mr-2" />
            View all photos
          </Button>
        </div>
      )}

      {/* Address & Hours */}
      <div className="px-4 py-6 space-y-4">
        {/* Address Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{restaurantData.address}</p>
                {restaurantData.city && <p className="text-sm text-muted-foreground">{restaurantData.city}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Hours Card */}
        {getOpeningHours() && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      Hours
                      {getStatusBadge()}
                    </p>
                    <p className="text-sm text-muted-foreground">{getCurrentHours()}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowHoursExpanded(!showHoursExpanded)}>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showHoursExpanded ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              {showHoursExpanded && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  {getOpeningHours()!.map((hour, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{hour.split(': ')[0]}</span>
                      <span className="text-muted-foreground">{hour.split(': ')[1]}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map */}
      {restaurantData.latitude && restaurantData.longitude && (
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Location</h3>
            <Button variant="ghost" size="sm" onClick={handleDirections}>
              Open in Maps
            </Button>
          </div>
          <Card className="overflow-hidden">
            <div ref={mapRef} className="h-56">
              {showMap && (
                <RestaurantLocationMap 
                  latitude={restaurantData.latitude} 
                  longitude={restaurantData.longitude} 
                  name={restaurantData.name} 
                  address={restaurantData.address} 
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Sticky Action Bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-4 z-50">
          <div className="flex gap-3 max-w-md mx-auto">
            {getPhoneNumber() && (
              <Button onClick={handleCall} className="flex-1 rounded-full">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
            <Button onClick={handleDirections} className="flex-1 rounded-full">
              <Navigation className="h-4 w-4 mr-2" />
              Directions
            </Button>
            {restaurantData.website && (
              <Button onClick={handleWebsite} className="flex-1 rounded-full">
                <Globe className="h-4 w-4 mr-2" />
                Website
              </Button>
            )}
            <Button className="flex-1 rounded-full bg-primary text-primary-foreground">
              Reserve
            </Button>
          </div>
        </div>
      )}

      {/* Photo Gallery Modal */}
      <PhotoGallery 
        photos={heroCandidates.map(p => resolveImageUrl(p))} 
        photoCaptions={restaurantData.photoCaptions || restaurantData.photo_captions} 
        isOpen={isPhotoGalleryOpen} 
        onClose={() => setIsPhotoGalleryOpen(false)} 
        restaurantName={restaurantData.name} 
        isMobile={actualIsMobile} 
      />
    </div>
  );
}
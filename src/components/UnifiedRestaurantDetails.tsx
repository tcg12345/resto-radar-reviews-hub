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
        (window as any).requestIdleCallback(cb, { timeout: delay + 100 });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background">
        {/* Hero Image Carousel */}
        {deferPhotos && hasHeroPhoto && (
          <div className="relative w-full h-64 md:h-80 bg-muted overflow-hidden">
            {/* Hero Image */}
            <div className="w-full h-full">
              {heroSrc && (
                <img 
                  src={resolveImageUrl(heroSrc)} 
                  alt={restaurantData.name} 
                  className="w-full h-full object-cover" 
                  loading="lazy" 
                  decoding="async" 
                  onLoad={() => setHasLoadedHeroImage(true)} 
                  onError={() => setHeroIndex(i => i + 1)} 
                />
              )}
            </div>
            
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Floating Back and Share buttons */}
            {showBackButton && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack} 
                className="absolute top-4 left-4 h-10 w-10 p-0 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white border-0"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleShare} 
              className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/30 backdrop-blur-sm hover:bg-black/50 text-white border-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            
            {/* Photo count chip */}
            <div 
              className="absolute top-4 right-16 bg-black/40 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm cursor-pointer hover:bg-black/60 transition-colors"
              onClick={() => navigate(`/restaurant/${restaurantData.place_id || restaurantData.id}/community-photos?name=${encodeURIComponent(restaurantData.name)}`)}
            >
              View photos ({heroCandidates.length})
            </div>
            
            {/* Restaurant name overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
                {restaurantData.name}
              </h1>
              
              {/* Quick actions */}
              <div className="flex items-center gap-3 mb-4">
                <Button 
                  onClick={handleAddToWishlist} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0 px-3"
                  disabled={isAdding}
                >
                  <Star className="h-4 w-4 mr-1" />
                  Wishlist
                </Button>
                <Button 
                  onClick={handleAddToWishlist} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0 px-3"
                  disabled={isAdding}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to List
                </Button>
              </div>
            </div>
            
            {/* Carousel indicators */}
            {heroCandidates.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {heroCandidates.map((_, index) => (
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
        )}

        {/* Main Content */}
        <div className="space-y-8 px-4 py-6">
          {/* Shared by info */}
          {restaurantData.isSharedRestaurant && restaurantData.sharedBy && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Shared by {restaurantData.sharedBy.name}</p>
                    {restaurantData.sharedBy.username && (
                      <p className="text-xs text-muted-foreground">@{restaurantData.sharedBy.username}</p>
                    )}
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

          {/* Restaurant Summary */}
          <Card className="shadow-sm border-0 bg-card/50">
            <CardContent className="p-6">
              <div className="mb-4">
                {/* Don't duplicate the name if it's already in the hero */}
                {!hasHeroPhoto && (
                  <h1 className="text-3xl font-bold text-foreground mb-3">{restaurantData.name}</h1>
                )}
                
                {/* Cuisine and Price chips */}
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium">
                    {restaurantData.cuisine}
                  </Badge>
                  
                  <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-green-200 text-green-600 bg-green-50 dark:bg-green-950/50 dark:border-green-800 dark:text-green-400">
                    {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range) || '$$$$'}
                  </Badge>
                  
                  {(restaurantData.michelinStars > 0 || restaurantData.michelin_stars > 0) && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium border-red-200 text-red-600 bg-red-50 dark:bg-red-950/50 dark:border-red-800 dark:text-red-400 flex items-center gap-2">
                      <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars || 0} readonly={true} size="sm" />
                      Michelin
                    </Badge>
                  )}
                  
                  {isEnhancingWithAI && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      Enhancing...
                    </div>
                  )}
                </div>

                {/* Status */}
                {restaurantData.isOpen !== undefined && (
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm font-medium ${restaurantData.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {restaurantData.isOpen ? 'Open now' : 'Closed'}
                    </span>
                  </div>
                )}
              </div>

              {/* Shared restaurant rating */}
              {restaurantData.rating && restaurantData.isSharedRestaurant && restaurantData.sharedBy && (
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{restaurantData.rating.toFixed(1)}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{restaurantData.sharedBy.name}'s Rating</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span className="text-xs text-muted-foreground">Personal rating</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Friends and Experts Rating Cards */}
          {deferCommunity && restaurantData.place_id && (
            <div className="grid grid-cols-2 gap-4">
              {/* Friends Rating Card */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => navigate(`/restaurant/${restaurantData.place_id}/friends-ratings?name=${encodeURIComponent(restaurantData.name)}`)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">Friends</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {isLoadingStats ? '—' : friendStats.avg ? `${friendStats.avg}/10` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isLoadingStats ? 'Loading…' : friendStats.count === 0 ? 'No reviews yet — be the first!' : `${friendStats.count} reviews`}
                  </div>
                </CardContent>
              </Card>
              
              {/* Expert Rating Card */}
              <Card 
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
                onClick={() => navigate(`/restaurant/${restaurantData.place_id}/expert-ratings?name=${encodeURIComponent(restaurantData.name)}`)}
              >
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium text-muted-foreground">Experts</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {isLoadingStats ? '—' : expertStats.avg ? `${expertStats.avg}/10` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isLoadingStats ? 'Loading…' : expertStats.count === 0 ? 'No reviews yet — be the first!' : `${expertStats.count} reviews`}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Primary Action Buttons - Pill shaped row */}
          <div className="flex gap-3 justify-center">
            {getPhoneNumber() && (
              <Button 
                onClick={handleCall} 
                className="flex items-center gap-2 rounded-full px-6 py-3 bg-primary hover:bg-primary/90" 
                variant="default"
              >
                <Phone className="h-4 w-4" />
                Call
              </Button>
            )}
            <Button 
              onClick={handleDirections} 
              className="flex items-center gap-2 rounded-full px-6 py-3 bg-primary hover:bg-primary/90" 
              variant="default"
            >
              <Navigation className="h-4 w-4" />
              Directions
            </Button>
            {restaurantData.website && (
              <Button 
                onClick={handleWebsite} 
                className="flex items-center gap-2 rounded-full px-6 py-3 bg-primary hover:bg-primary/90" 
                variant="default"
              >
                <Globe className="h-4 w-4" />
                Website
              </Button>
            )}
          </div>

          {/* Community Rating with improved design */}
          {deferCommunity && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Community Rating</h3>
                  {communityStats?.totalReviews > 0 && (
                    <Button variant="outline" size="sm" className="text-sm">
                      {communityStats.totalReviews} reviews
                    </Button>
                  )}
                </div>
                
                {communityStats?.totalReviews > 0 ? (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Overall Rating */}
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 border-4 border-green-200 dark:border-green-800 flex items-center justify-center mx-auto mb-2">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {communityStats.averageRating?.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">out of 10</span>
                      </div>
                    </div>
                    
                    {/* Rating Distribution */}
                    <div className="col-span-2 space-y-2">
                      {[
                        { label: '9-10', value: communityStats.ratingDistribution?.['9-10'] || 0 },
                        { label: '7-8', value: communityStats.ratingDistribution?.['7-8'] || 0 },
                        { label: '5-6', value: communityStats.ratingDistribution?.['5-6'] || 0 },
                        { label: '3-4', value: communityStats.ratingDistribution?.['3-4'] || 0 },
                        { label: '1-2', value: communityStats.ratingDistribution?.['1-2'] || 0 },
                      ].map((item, index) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="text-xs w-8 text-muted-foreground">{item.label}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-green-400 transition-all duration-300`}
                              style={{ 
                                width: `${(item.value / Math.max(1, communityStats.totalReviews)) * 100}%`,
                                opacity: 1 - (index * 0.15)
                              }}
                            />
                          </div>
                          <span className="text-xs w-8 text-right text-muted-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <Star className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No community reviews yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to rate this restaurant!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photo Gallery */}
          {deferPhotos && (
            <UnifiedPhotoGallery 
              stats={communityStats} 
              isLoading={isLoadingReviews} 
              onPhotoClick={() => {}} 
              friendPhotos={restaurantData.isSharedRestaurant && restaurantData.photos && restaurantData.photos.length > 0 ? 
                restaurantData.photos.map((url, index) => ({
                  url,
                  caption: Array.isArray(restaurantData.photoCaptions) ? restaurantData.photoCaptions[index] : '',
                  dishName: Array.isArray(restaurantData.photo_captions) ? restaurantData.photo_captions[index] : ''
                })) : undefined
              } 
              friendName={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.name : undefined} 
              friendId={restaurantData.isSharedRestaurant ? restaurantData.sharedBy?.id : undefined} 
              restaurantId={restaurantData.id} 
              restaurantPlaceId={restaurantData.place_id} 
              restaurantName={restaurantData.name} 
            />
          )}

          {/* Address & Hours Cards */}
          <div className="space-y-4">
            {/* Address Card */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Address</p>
                    <p className="text-sm text-muted-foreground">{restaurantData.address}</p>
                    {restaurantData.city && (
                      <p className="text-sm text-muted-foreground">{restaurantData.city}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hours Card */}
            {getOpeningHours() && (
              <Card className="shadow-sm">
                <CardContent className="p-6">
                  <OpeningHoursDisplay hours={getOpeningHours()!} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notes */}
          {restaurantData.notes && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {restaurantData.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Map */}
          {restaurantData.latitude && restaurantData.longitude && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Location</h3>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Open in Maps
                  </Button>
                </div>
                <div ref={mapRef} className="h-64 rounded-lg overflow-hidden">
                  {showMap && (
                    <RestaurantLocationMap 
                      latitude={restaurantData.latitude} 
                      longitude={restaurantData.longitude} 
                      name={restaurantData.name} 
                      address={restaurantData.address} 
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Photo Gallery Modal */}
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
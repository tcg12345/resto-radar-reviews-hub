import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ArrowLeft, MapPin, Clock, Phone, Globe, Star, Heart, Plus, Share2, Navigation, ExternalLink, Check, User, Users, Award, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [isHoursExpanded, setIsHoursExpanded] = useState(false);
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
    
    schedule(() => setDeferCommunity(true), 50);
    schedule(() => setDeferPhotos(true), 100);
    schedule(() => setDeferHeavy(true), 200);
  }, []);

  useEffect(() => {
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
      const promises = [];
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
        promises.push(Promise.resolve({ data: { cuisine: restaurant.cuisine } }));
      }

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
        promises.push(Promise.resolve({ data: { michelinStars: restaurant.michelinStars || restaurant.michelin_stars } }));
      }

      const [cuisineResult, michelinResult] = await Promise.all(promises);
      setRestaurantData(prev => ({
        ...prev,
        cuisine: cuisineResult?.data?.cuisine || prev.cuisine,
        michelinStars: michelinResult?.data?.michelinStars !== undefined ? michelinResult.data.michelinStars : prev.michelinStars || prev.michelin_stars || 0
      }));
    } catch (error) {
      console.error('Error enhancing restaurant with AI:', error);
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

  const formatDistance = (distance?: number) => {
    if (!distance) return '';
    return `${distance.toFixed(1)} mi away`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="h-48 bg-gray-800 animate-pulse"></div>
        <div className="p-4 space-y-4">
          <div className="h-6 bg-gray-800 animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-gray-800 animate-pulse rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-800 animate-pulse rounded"></div>
            <div className="h-4 bg-gray-800 animate-pulse rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950">
        {/* Hero Section with Cover Photo */}
        <div className="relative h-[300px] w-full overflow-hidden">
          {hasHeroPhoto ? (
            <div className="relative h-full w-full">
              <img 
                src={resolveImageUrl(heroSrc)}
                alt={restaurantData.name}
                className="h-full w-full object-cover"
                onLoad={() => setHasLoadedHeroImage(true)}
              />
            </div>
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-center text-white/80">
                <Globe className="h-12 w-12 mx-auto mb-2" />
                <p>No photo available</p>
              </div>
            </div>
          )}
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Floating action buttons */}
          {showBackButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBack}
              className="absolute top-4 left-4 h-10 w-10 p-0 bg-black/30 backdrop-blur-sm border-0 hover:bg-black/40 text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            className="absolute top-4 right-4 h-10 w-10 p-0 bg-black/30 backdrop-blur-sm border-0 hover:bg-black/40 text-white"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          
          
          {/* Restaurant name overlay */}
          <div className="absolute bottom-6 left-4 right-4 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white leading-tight">
              {restaurantData.name}
            </h1>
            {/* View photos button */}
            {(photos.length > 0 || (communityStats?.recentPhotos?.length || 0) > 0) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPhotoGalleryOpen(true)}
                className="bg-black/40 backdrop-blur-sm border-0 hover:bg-black/50 text-white text-xs px-3 py-2 h-8 rounded-full"
              >
                View photos ({heroCandidates.length})
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative bg-gray-950 -mt-4 rounded-t-3xl pt-6">
          {/* Restaurant metadata */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="text-gray-300 text-base">{restaurantData.cuisine}</span>
              <span className="text-green-400 font-semibold text-base">
                {getPriceDisplay(restaurantData.priceRange || restaurantData.price_range)}
              </span>
              {(restaurantData.michelinStars || restaurantData.michelin_stars) && 
                (restaurantData.michelinStars || restaurantData.michelin_stars) > 0 && (
                <div className="flex items-center gap-1">
                  <MichelinStars stars={restaurantData.michelinStars || restaurantData.michelin_stars} readonly={true} />
                </div>
              )}
            </div>
            
            {/* Wishlist and Add to List buttons */}
            {canAddToWishlist && (
              <div className="flex gap-3 mb-6">
                <Button
                  onClick={handleAddToWishlist}
                  variant="outline"
                  className="flex-1 flex items-center gap-2 bg-gray-900/50 border-gray-700 text-white hover:bg-gray-800"
                  disabled={isAdding}
                >
                  <Heart className="h-4 w-4" />
                  {isAdding ? 'Adding...' : 'Wishlist'}
                </Button>
                <Button
                  onClick={handleAddToWishlist}
                  variant="outline"
                  className="flex-1 flex items-center gap-2 bg-gray-900/50 border-gray-700 text-white hover:bg-gray-800"
                  disabled={isAdding}
                >
                  <Plus className="h-4 w-4" />
                  {isAdding ? 'Adding...' : 'Add to List'}
                </Button>
              </div>
            )}
          </div>

          {/* Friends & Experts Reviews - Compact Cards */}
          {deferCommunity && restaurantData.place_id && (
            <div className="px-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gray-900/50 border-gray-800 cursor-pointer hover:bg-gray-900/70 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-gray-300">Friends</span>
                    </div>
                    <div className="text-xl font-bold text-white mb-1">
                      {isLoadingStats ? '—' : friendStats.count || 0}
                    </div>
                    <p className="text-xs text-gray-400">
                      {friendStats.count === 0 ? 'Be the first to review' : 'reviews'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800 cursor-pointer hover:bg-gray-900/70 transition-colors">
                  <CardContent className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-medium text-gray-300">Experts</span>
                    </div>
                    <div className="text-xl font-bold text-white mb-1">
                      {isLoadingStats ? '—' : expertStats.count || 0}
                    </div>
                    <p className="text-xs text-gray-400">
                      {expertStats.count === 0 ? 'Be the first to review' : 'reviews'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Primary Action Buttons - Pill-shaped */}
          <div className="px-4 mb-6">
            <div className="flex gap-3">
              {getPhoneNumber() && (
                <Button
                  onClick={handleCall}
                  className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              )}
              <Button
                onClick={handleDirections}
                className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                <Navigation className="h-4 w-4" />
                Directions
              </Button>
              {restaurantData.website && (
                <Button
                  onClick={handleWebsite}
                  className="flex-1 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </Button>
              )}
            </div>
          </div>

          {/* Community Rating */}
          {deferCommunity && (
            <div className="px-4 mb-6">
              <CommunityRating stats={communityStats} isLoading={isLoadingReviews} />
            </div>
          )}

          {/* Photos Section - Cards with rounded corners */}
          {deferPhotos && (
            <div className="px-4 mb-6">
              <UnifiedPhotoGallery 
                stats={communityStats} 
                isLoading={isLoadingReviews} 
                onPhotoClick={() => setIsPhotoGalleryOpen(true)} 
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
            </div>
          )}

          {/* Address & Hours - Card Layout */}
          <div className="px-4 mb-6 space-y-3">
            {/* Address Card */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white mb-1">Address</p>
                    <p className="text-sm text-gray-300">{restaurantData.address}</p>
                    {restaurantData.city && (
                      <p className="text-sm text-gray-400">{restaurantData.city}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white"
                    onClick={() => {
                      const fullAddress = `${restaurantData.address}${restaurantData.city ? `, ${restaurantData.city}` : ''}`;
                      navigator.clipboard.writeText(fullAddress);
                      toast.success('Address copied to clipboard!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hours Card */}
            {getOpeningHours() && (
              <Card className="bg-gray-900/50 border-gray-800/50 rounded-xl">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-800/50 rounded-lg">
                        <Clock className="h-4 w-4 text-gray-300" />
                      </div>
                      <h3 className="text-base font-semibold text-white">Hours</h3>
                    </div>
                    
                    {/* Status Badge - Top Right */}
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                        restaurantData.isOpen 
                          ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/30' 
                          : 'bg-red-950/50 text-red-300 border-red-800/30'
                      }`}>
                        {restaurantData.isOpen ? '● Open now' : '● Closed'}
                      </span>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-gray-400 hover:text-white p-1 h-auto"
                        onClick={() => setIsHoursExpanded(!isHoursExpanded)}
                      >
                        {isHoursExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Today's hours only */}
                  {!isHoursExpanded && (
                    <div>
                      <div className="bg-blue-950/30 border border-blue-800/20 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-white">Today</span>
                            <span className="text-xs text-blue-400 font-medium">(Current)</span>
                          </div>
                          <span className="text-sm text-gray-300 font-mono">
                            {(() => {
                              const todayIndex = new Date().getDay();
                              const hoursArray = getOpeningHours();
                              if (!hoursArray) return 'Hours unavailable';
                              const todayHours = hoursArray[todayIndex];
                              if (!todayHours) return 'Hours unavailable';
                              const parts = todayHours.split(':');
                              return parts.length > 1 ? parts.slice(1).join(':').trim() : 'Closed';
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-gray-400 hover:text-white text-xs"
                          onClick={() => setIsHoursExpanded(true)}
                        >
                          View full week
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Full week schedule */}
                  {isHoursExpanded && (
                    <div className="space-y-0 border border-gray-700/30 rounded-lg overflow-hidden">
                      {getOpeningHours()?.map((hours, index) => {
                        const todayIndex = new Date().getDay();
                        const isToday = index === todayIndex;
                        const parts = hours.split(':');
                        const dayName = parts[0]?.trim();
                        const timeRange = parts.length > 1 ? parts.slice(1).join(':').trim() : 'Closed';
                        
                        return (
                          <div 
                            key={index} 
                            className={`flex justify-between items-center py-3 px-4 border-b border-gray-700/20 last:border-b-0 ${
                              isToday 
                                ? 'bg-blue-950/30 border-l-2 border-l-blue-500' 
                                : 'bg-gray-900/20'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold min-w-[80px] ${
                                isToday ? 'text-blue-300' : 'text-gray-300'
                              }`}>
                                {dayName}
                              </span>
                            </div>
                            
                            <span className={`text-sm font-mono ${
                              isToday ? 'text-white font-medium' : 'text-gray-400'
                            }`}>
                              {timeRange}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Map */}
          {restaurantData.latitude && restaurantData.longitude && (
            <div className="px-4 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Location</h3>
              <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
                <div ref={mapRef} className="h-60">
                  {showMap && (
                    <RestaurantLocationMap 
                      latitude={restaurantData.latitude} 
                      longitude={restaurantData.longitude} 
                      name={restaurantData.name} 
                      address={restaurantData.address} 
                    />
                  )}
                </div>
                <CardContent className="p-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-blue-400 hover:text-blue-300"
                    onClick={handleDirections}
                  >
                    Open in Maps
                  </Button>
                </CardContent>
              </Card>
            </div>
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

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Phone, Globe, Clock, Heart, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { RestaurantLocationMap } from '@/components/RestaurantLocationMap';
import { MichelinStars } from '@/components/MichelinStars';
import { FriendRatingDisplay } from '@/components/FriendRatingDisplay';
import { FriendPhotoGallery } from '@/components/FriendPhotoGallery';

import { useRestaurantReviews } from '@/hooks/useRestaurantReviews';

interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  formatted_phone_number?: string;
  website?: string;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
    menu_url?: string;
  };
  aiAnalysis?: {
    cuisine: string;
    categories: string[];
  };
  michelinStars?: number;
  fallbackCuisine?: string;
}

export default function MobileSearchRestaurantDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const placeData = searchParams.get('data');
  const [restaurant, setRestaurant] = useState<GooglePlaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isEnhancingWithAI, setIsEnhancingWithAI] = useState(false);
  
  
  // Use restaurant place_id for community reviews
  const { communityStats, isLoading: isLoadingReviews } = useRestaurantReviews(restaurant?.place_id || null);

  const handleBack = () => {
    // Check if we have history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // Fallback to search page if no history
      navigate('/search');
    }
  };

  useEffect(() => {
    if (placeData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(placeData));
        setRestaurant(parsedData);
        
        // Load additional details if we have a place_id
        if (parsedData.place_id) {
          loadPlaceDetails(parsedData.place_id, parsedData);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error parsing place data:', error);
        toast.error('Invalid restaurant data');
        handleBack();
      }
    } else {
      toast.error('No restaurant data provided');
      handleBack();
    }
  }, [placeData, navigate]);

  const loadPlaceDetails = async (placeId: string, basicData: GooglePlaceResult) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-places-search', {
        body: {
          placeId: placeId,
          type: 'details'
        }
      });

      if (error) throw error;

      if (data.status === 'OK') {
        const detailedPlace = { ...basicData, ...data.result };
        setRestaurant(detailedPlace);

        // Load Yelp data in background
        supabase.functions.invoke('yelp-restaurant-data', {
          body: {
            action: 'search',
            term: detailedPlace.name,
            location: detailedPlace.formatted_address,
            limit: 1,
            sort_by: 'best_match'
          }
        }).then(({ data: yelpData, error: yelpError }) => {
          if (!yelpError && yelpData?.businesses?.length > 0) {
            const yelpBusiness = yelpData.businesses[0];
            setRestaurant(prev => prev ? {
              ...prev,
              yelpData: {
                id: yelpBusiness.id,
                url: yelpBusiness.url,
                categories: yelpBusiness.categories?.map((cat: any) => cat.title) || [],
                price: yelpBusiness.price || undefined,
                photos: yelpBusiness.photos || [],
                transactions: yelpBusiness.transactions || [],
                menu_url: yelpBusiness.menu_url || undefined
              }
            } : null);
          }
        });
        
        // Enhance with AI after basic data is loaded
        enhanceWithAI(detailedPlace);
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const shouldEnhanceWithAI = (restaurant: GooglePlaceResult): boolean => {
    const hasGenericCuisine = !restaurant.aiAnalysis?.cuisine && (
      !restaurant.fallbackCuisine ||
      restaurant.fallbackCuisine.toLowerCase().includes('restaurant') ||
      restaurant.fallbackCuisine.toLowerCase().includes('bar') ||
      restaurant.fallbackCuisine.toLowerCase().includes('food') ||
      restaurant.fallbackCuisine.toLowerCase().includes('establishment')
    );
    
    const hasMissingMichelinInfo = restaurant.michelinStars === undefined;
    
    return hasGenericCuisine || hasMissingMichelinInfo;
  };

  const enhanceWithAI = async (restaurant: GooglePlaceResult) => {
    if (!shouldEnhanceWithAI(restaurant)) return;
    
    try {
      setIsEnhancingWithAI(true);
      
      // Run both AI functions in parallel for speed
      const promises = [];
      
      // Enhance cuisine if needed
      const hasGenericCuisine = !restaurant.aiAnalysis?.cuisine && (
        !restaurant.fallbackCuisine ||
        restaurant.fallbackCuisine.toLowerCase().includes('restaurant') ||
        restaurant.fallbackCuisine.toLowerCase().includes('bar') ||
        restaurant.fallbackCuisine.toLowerCase().includes('food') ||
        restaurant.fallbackCuisine.toLowerCase().includes('establishment')
      );
      
      if (hasGenericCuisine) {
        promises.push(
          supabase.functions.invoke('ai-cuisine-detector', {
            body: {
              restaurantName: restaurant.name,
              address: restaurant.formatted_address,
              types: restaurant.types || []
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: { cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine } }));
      }
      
      // Detect Michelin stars if missing
      const hasMissingMichelinInfo = restaurant.michelinStars === undefined;
      
      if (hasMissingMichelinInfo) {
        promises.push(
          supabase.functions.invoke('ai-michelin-detector', {
            body: {
              name: restaurant.name,
              address: restaurant.formatted_address,
              city: restaurant.formatted_address.split(',')[1]?.trim() || '',
              country: restaurant.formatted_address.split(',').pop()?.trim() || '',
              cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || '',
              notes: ''
            }
          })
        );
      } else {
        promises.push(Promise.resolve({ data: { michelinStars: restaurant.michelinStars } }));
      }
      
      // Wait for both to complete
      const [cuisineResult, michelinResult] = await Promise.all(promises);
      
      // Update restaurant data with AI enhancements
      setRestaurant(prev => prev ? {
        ...prev,
        aiAnalysis: {
          cuisine: cuisineResult?.data?.cuisine || prev.aiAnalysis?.cuisine || prev.fallbackCuisine || 'Restaurant',
          categories: prev.aiAnalysis?.categories || []
        },
        michelinStars: michelinResult?.data?.michelinStars !== undefined ? 
          michelinResult.data.michelinStars : (prev.michelinStars || 0)
      } : null);
      
      console.log('AI Enhancement Results:', {
        cuisine: cuisineResult?.data?.cuisine,
        michelinStars: michelinResult?.data?.michelinStars,
        restaurantName: restaurant.name
      });
      
    } catch (error) {
      console.error('Error enhancing restaurant with AI:', error);
      // Silently fail - don't show error to user for this enhancement
    } finally {
      setIsEnhancingWithAI(false);
    }
  };

  const handleAddToWishlist = async () => {
    if (!user || !restaurant) {
      toast.error('Please log in to add restaurants');
      return;
    }

    setIsAddingToWishlist(true);
    try {
      const { error } = await supabase.from('restaurants').insert({
        name: restaurant.name,
        address: restaurant.formatted_address,
        city: restaurant.formatted_address.split(',')[1]?.trim() || '',
        cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || 'Various',
        latitude: restaurant.geometry.location.lat,
        longitude: restaurant.geometry.location.lng,
        rating: null,
        is_wishlist: true,
        user_id: user.id,
        website: restaurant.website,
        opening_hours: restaurant.opening_hours?.weekday_text?.join('\n'),
        price_range: restaurant.price_level,
        phone_number: restaurant.formatted_phone_number,
        google_place_id: restaurant.place_id
      });

      if (error) throw error;
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  const handleAddRating = async () => {
    if (!user || !restaurant) {
      toast.error('Please log in to rate restaurants');
      return;
    }

    try {
      const { error } = await supabase.from('restaurants').insert({
        name: restaurant.name,
        address: restaurant.formatted_address,
        city: restaurant.formatted_address.split(',')[1]?.trim() || '',
        cuisine: restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || 'Various',
        latitude: restaurant.geometry.location.lat,
        longitude: restaurant.geometry.location.lng,
        rating: null,
        is_wishlist: false,
        user_id: user.id,
        website: restaurant.website,
        opening_hours: restaurant.opening_hours?.weekday_text?.join('\n'),
        price_range: restaurant.price_level,
        phone_number: restaurant.formatted_phone_number,
        google_place_id: restaurant.place_id
      });

      if (error) throw error;
      toast.success('Restaurant added! You can now rate it from your places.');
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error('Failed to add restaurant');
    }
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  const getPhotoUrl = (photoReference: string) => {
    // Use direct URL without environment variable since Lovable doesn't support VITE_ vars
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=AIzaSyDGyJd_l_BZAnseiAx5a5n4a1nSBqnS4dA`;
  };

  if (isLoading || !restaurant) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="h-48 bg-muted rounded-lg animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-6 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold text-lg line-clamp-1">{restaurant.name}</h1>
        </div>
      </div>

      <div className="pb-safe">
        {/* Hero Image */}
        {(restaurant.photos?.length > 0 || restaurant.yelpData?.photos?.length > 0) && (
          <div 
            className="aspect-video relative cursor-pointer group"
            onClick={() => navigate(`/restaurant/${restaurant.place_id}/photos?placeId=${restaurant.place_id}`)}
          >
            <img
              src={
                restaurant.yelpData?.photos?.[0] ||
                (restaurant.photos?.[0] ? getPhotoUrl(restaurant.photos[0].photo_reference) : '')
              }
              alt={restaurant.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-md text-sm">
              View all photos
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Basic Info with Community Rating */}
          <div className="flex gap-4">
            {/* Main content */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold leading-tight">{restaurant.name}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm line-clamp-2">{restaurant.formatted_address}</span>
                  </div>
                </div>
              </div>

              {/* Rating and Price */}
              <div className="flex items-center gap-4 flex-wrap">
                {restaurant.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{restaurant.rating}</span>
                    {restaurant.user_ratings_total && (
                      <span className="text-sm text-muted-foreground">
                        ({restaurant.user_ratings_total.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
                
                {(restaurant.price_level || restaurant.yelpData?.price) && (
                  <div className="text-lg font-bold text-green-600">
                    {restaurant.yelpData?.price || getPriceDisplay(restaurant.price_level)}
                  </div>
                )}

                {restaurant.opening_hours?.open_now !== undefined && (
                  <Badge variant={restaurant.opening_hours.open_now ? "default" : "destructive"}>
                    {restaurant.opening_hours.open_now ? "Open" : "Closed"}
                  </Badge>
                )}
              </div>

              {/* Cuisine and Categories */}
              <div className="flex flex-wrap gap-2">
                {!isEnhancingWithAI && (() => {
                  const cuisine = restaurant.aiAnalysis?.cuisine || restaurant.fallbackCuisine || 
                    restaurant.types.find(type => !['restaurant', 'food', 'establishment', 'point_of_interest'].includes(type))?.replace(/_/g, ' ') || 'Restaurant';
                  return (
                    <Badge variant="outline">
                      {cuisine}
                    </Badge>
                  );
                })()}
                
                {/* Michelin Stars */}
                {!isEnhancingWithAI && restaurant.michelinStars && restaurant.michelinStars > 0 && (() => {
                  console.log('Displaying Michelin stars:', restaurant.michelinStars, 'for restaurant:', restaurant.name);
                  return (
                    <Badge variant="outline">
                      <MichelinStars stars={restaurant.michelinStars} readonly={true} size="sm" />
                    </Badge>
                  );
                })()}
                
                {restaurant.yelpData?.categories?.slice(0, 2).map((category, index) => (
                  <Badge key={index} variant="outline">{category}</Badge>
                ))}
              </div>
            </div>

            {/* Community Rating Display on the right */}
            <div className="flex-shrink-0">
              <FriendRatingDisplay 
                communityAverageRating={communityStats?.averageRating}
                totalCommunityReviews={communityStats?.totalReviews}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleAddToWishlist}
              disabled={isAddingToWishlist}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Heart className="h-4 w-4" />
              {isAddingToWishlist ? 'Adding...' : 'Add to Wishlist'}
            </Button>
            <Button
              onClick={handleAddRating}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Rate Restaurant
            </Button>
          </div>

          {/* Contact Info */}
          {(restaurant.formatted_phone_number || restaurant.website) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Contact Information</h3>
                
                {restaurant.formatted_phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={`tel:${restaurant.formatted_phone_number}`}
                      className="text-primary hover:underline"
                    >
                      {restaurant.formatted_phone_number}
                    </a>
                  </div>
                )}
                
                {restaurant.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={restaurant.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hours */}
          {restaurant.opening_hours?.weekday_text && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Hours</h3>
                </div>
                <div className="space-y-0">
                  {restaurant.opening_hours.weekday_text.map((hours, index) => {
                    const [day, time] = hours.split(': ');
                    return (
                      <div key={index}>
                        <div className="flex justify-between items-center py-3">
                          <span className="font-medium">{day}</span>
                          <span className="text-muted-foreground">{time}</span>
                        </div>
                        {index < restaurant.opening_hours.weekday_text.length - 1 && (
                          <div className="border-b border-border"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location Map */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Location</h3>
              </div>
              <div className="h-64 w-full rounded-lg overflow-hidden border">
                <RestaurantLocationMap
                  latitude={restaurant.geometry.location.lat}
                  longitude={restaurant.geometry.location.lng}
                  name={restaurant.name}
                  address={restaurant.formatted_address}
                />
              </div>
            </CardContent>
          </Card>

          {/* Yelp Data */}
          {restaurant.yelpData && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Yelp Information</h3>
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    Yelp ✓
                  </Badge>
                </div>
                
                {restaurant.yelpData.transactions?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {restaurant.yelpData.transactions.map((transaction, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {transaction === 'delivery' && '🚚 Delivery'}
                        {transaction === 'pickup' && '🛍️ Pickup'}
                        {transaction === 'restaurant_reservation' && '📅 Reservations'}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => window.open(restaurant.yelpData!.url, '_blank')}
                  className="w-full"
                >
                  View on Yelp
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )}


          {/* Reviews Preview */}
          {restaurant.reviews && restaurant.reviews.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Recent Reviews</h3>
                {restaurant.reviews.slice(0, 3).map((review, index) => (
                  <div key={index} className="space-y-2 pb-3 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{review.author_name}</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {review.text}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}


        </div>
      </div>

    </div>
  );
}
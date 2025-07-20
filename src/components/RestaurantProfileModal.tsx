import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/StarRating';
import { Star, MapPin, Phone, Globe, Navigation, Clock, Heart, MessageSquare, Camera, Filter, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurants } from '@/contexts/RestaurantContext';
import { GlobalSearchMap } from '@/components/GlobalSearchMap';
interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    weekday_text: string[];
  };
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
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}
interface RestaurantProfileModalProps {
  place: PlaceDetails;
  onClose: () => void;
}
export function RestaurantProfileModal({
  place,
  onClose
}: RestaurantProfileModalProps) {
  const {
    user
  } = useAuth();
  const { addRestaurant } = useRestaurants();
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [reviewSortBy, setReviewSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [aiCuisine, setAiCuisine] = useState<string>('');
  const [aiCategories, setAiCategories] = useState<string[]>([]);
  const [isLoadingAiAnalysis, setIsLoadingAiAnalysis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze restaurant with AI on component mount
  useState(() => {
    const analyzeRestaurant = async () => {
      setIsLoadingAiAnalysis(true);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('ai-restaurant-analysis', {
          body: {
            name: place.name,
            types: place.types,
            address: place.formatted_address,
            description: place.reviews?.[0]?.text || undefined
          }
        });
        if (!error && data.success) {
          setAiCuisine(data.cuisine);
          setAiCategories(data.categories);
        }
      } catch (error) {
        console.error('Error analyzing restaurant:', error);
      } finally {
        setIsLoadingAiAnalysis(false);
      }
    };
    analyzeRestaurant();
  });
  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };
  const handleRatingClick = () => {
    const searchQuery = `${place.name} ${place.formatted_address} reviews`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };
  const handleViewMoreReviews = () => {
    const searchQuery = `${place.name} ${place.formatted_address} reviews site:google.com`;
    window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
  };
  const getSortedReviews = () => {
    if (!place.reviews) return [];
    const reviews = [...place.reviews];
    switch (reviewSortBy) {
      case 'recent':
        return reviews.sort((a, b) => b.time - a.time);
      case 'helpful':
        return reviews.sort((a, b) => b.rating - a.rating);
      case 'rating':
        return reviews.sort((a, b) => b.rating - a.rating);
      default:
        return reviews;
    }
  };
  const handlePhotoUpload = async (files: FileList) => {
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    const selectedFiles = Array.from(files).slice(0, 5);
    try {
      for (const file of selectedFiles) {
        const url = URL.createObjectURL(file);
        uploadedUrls.push(url);
      }
      setReviewPhotoUrls(prev => [...prev, ...uploadedUrls]);
      setReviewPhotos(prev => [...prev, ...selectedFiles]);
      toast.success(`${selectedFiles.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };
  const removePhoto = (index: number) => {
    setReviewPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setReviewPhotos(prev => prev.filter((_, i) => i !== index));
  };
  const handleAddToWishlist = async () => {
    if (!user) {
      toast.error('Please sign in to add to wishlist');
      return;
    }
    setIsAddingToWishlist(true);
    try {
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: place.name,
            address: place.formatted_address,
            city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
            country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
            cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
            notes: `Added from Global Search`
          }
        });
        if (aiData && aiData.michelinStars !== null) {
          michelinStars = aiData.michelinStars;
        }
      } catch (error) {
        console.log('Could not determine Michelin stars:', error);
      }

      // Parse address components properly
      const addressParts = place.formatted_address.split(',').map(part => part.trim());
      let city = '';
      let country = '';
      
      // For US addresses, typically: "Street, City, State ZIP, USA"
      // For international: "Street, City, Country" or "Street, City, Postal Code, Country"
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1];
        const secondLastPart = addressParts[addressParts.length - 2];
        
        // Check if last part looks like a country
        if (lastPart.match(/^(USA|United States|US)$/i)) {
          country = 'United States';
          // For US, city is typically the second part (index 1)
          city = addressParts[1] || '';
        } else if (lastPart.length <= 4 && /^\d/.test(lastPart)) {
          // Last part looks like a postal code, so second-to-last is likely country
          country = secondLastPart;
          city = addressParts[addressParts.length - 3] || '';
        } else {
          // Last part is likely the country
          country = lastPart;
          city = secondLastPart || '';
        }
      }

      const restaurantFormData = {
        name: place.name,
        address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
        city: city,
        country: country,
        cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: place.price_level,
        michelinStars: michelinStars,
        notes: `Added from Global Search`,
        dateVisited: '',
        photos: [], // No photos for wishlist
        isWishlist: true,
      };
      
      // Use the context function to add restaurant which will update local state
      await addRestaurant(restaurantFormData);
      toast.success('Added to wishlist!');
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error(`Failed to add to wishlist: ${error.message}`);
    } finally {
      setIsAddingToWishlist(false);
    }
  };
  const handleAddToRatings = async () => {
    if (!user) {
      toast.error('Please sign in to add ratings');
      return;
    }
    if (userRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setIsSubmittingReview(true);
    try {
      // Get Michelin stars using AI
      let michelinStars = null;
      try {
        const { data: aiData } = await supabase.functions.invoke('ai-michelin-detector', {
          body: {
            name: place.name,
            address: place.formatted_address,
            city: place.formatted_address.split(',').slice(-2, -1)[0]?.trim() || '',
            country: place.formatted_address.split(',').slice(-1)[0]?.trim() || '',
            cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
            notes: userReview || `Rated ${userRating} stars`
          }
        });
        if (aiData && aiData.michelinStars !== null) {
          michelinStars = aiData.michelinStars;
        }
      } catch (error) {
        console.log('Could not determine Michelin stars:', error);
      }

      // Parse address components properly for ratings too
      const addressParts = place.formatted_address.split(',').map(part => part.trim());
      let city = '';
      let country = '';
      
      if (addressParts.length >= 2) {
        const lastPart = addressParts[addressParts.length - 1];
        const secondLastPart = addressParts[addressParts.length - 2];
        
        if (lastPart.match(/^(USA|United States|US)$/i)) {
          country = 'United States';
          city = addressParts[1] || '';
        } else if (lastPart.length <= 4 && /^\d/.test(lastPart)) {
          country = secondLastPart;
          city = addressParts[addressParts.length - 3] || '';
        } else {
          country = lastPart;
          city = secondLastPart || '';
        }
      }

      const restaurantFormData = {
        name: place.name,
        address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
        city: city,
        country: country,
        cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
        rating: userRating,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: place.price_level,
        michelinStars: michelinStars,
        notes: userReview || `Rated ${userRating} stars`,
        dateVisited: new Date().toISOString(),
        photos: [], // Handle photos separately if needed
        isWishlist: false,
      };
      
      // Use the context function to add restaurant which will update local state
      await addRestaurant(restaurantFormData);
      toast.success('Rating added successfully!');
      setUserRating(0);
      setUserReview('');
      setReviewPhotos([]);
      setReviewPhotoUrls([]);
    } catch (error) {
      console.error('Error adding rating:', error);
      toast.error('Failed to add rating');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  const handleCallRestaurant = () => {
    if (place.formatted_phone_number) {
      window.open(`tel:${place.formatted_phone_number}`);
    } else {
      toast.error('Phone number not available');
    }
  };
  const handleVisitWebsite = () => {
    if (place.website) {
      window.open(place.website, '_blank');
    } else {
      toast.error('Website not available');
    }
  };
  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat},${place.geometry.location.lng}`;
    window.open(url, '_blank');
  };
  return <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{place.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Location & Contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p>{place.formatted_address}</p>
                  </div>
                  
                  {place.formatted_phone_number && <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p>{place.formatted_phone_number}</p>
                    </div>}

                  {place.website && <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      
                    </div>}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={handleCallRestaurant} disabled={!place.formatted_phone_number} className="flex-1 min-w-0">
                      <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Call</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleVisitWebsite} disabled={!place.website} className="flex-1 min-w-0">
                      <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Website</span>
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleGetDirections} className="flex-1 min-w-0">
                      <Navigation className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Directions</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Ratings & Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {place.rating && <div>
                      <button onClick={handleRatingClick} className="flex items-center gap-2 mb-2 hover:opacity-80 transition-opacity cursor-pointer">
                        <span className="text-2xl font-bold">{place.rating}</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-5 w-5 ${star <= Math.round(place.rating!) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                        </div>
                      </button>
                      {place.user_ratings_total && <p className="text-sm text-muted-foreground">
                          Based on {place.user_ratings_total} reviews
                        </p>}
                    </div>}

                  <div>
                    <p className="text-sm text-muted-foreground">Price Level</p>
                    <p className="font-semibold">{getPriceDisplay(place.price_level)}</p>
                  </div>

                  {place.opening_hours?.open_now !== undefined && <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={place.opening_hours.open_now ? "default" : "destructive"}>
                        <Clock className="h-3 w-3 mr-1" />
                        {place.opening_hours.open_now ? "Open Now" : "Closed"}
                      </Badge>
                    </div>}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={handleAddToWishlist} disabled={isAddingToWishlist || !user} className="flex-1 min-w-0">
                      <Heart className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">Add to Wishlist</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Opening Hours */}
            {place.opening_hours?.weekday_text && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {place.opening_hours.weekday_text.map((hours, index) => <p key={index} className="text-sm">
                        {hours}
                      </p>)}
                  </div>
                </CardContent>
              </Card>}

            {/* User Rating Section */}
            {user && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Add Your Rating & Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Rating</p>
                    <StarRating rating={userRating} onRatingChange={setUserRating} />
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Your Review (Optional)</p>
                    <Textarea placeholder="Share your experience..." value={userReview} onChange={e => setUserReview(e.target.value)} rows={3} />
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <Label htmlFor="review-photos" className="text-sm text-muted-foreground">
                      Add Photos (Optional)
                    </Label>
                    <div className="mt-2 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhotos || reviewPhotoUrls.length >= 5}>
                          <Camera className="h-4 w-4 mr-2" />
                          {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {reviewPhotoUrls.length}/5 photos
                        </span>
                      </div>
                      
                      <Input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    if (e.target.files) {
                      handlePhotoUpload(e.target.files);
                    }
                  }} />

                      {/* Photo Preview */}
                      {reviewPhotoUrls.length > 0 && <div className="grid grid-cols-5 gap-2">
                          {reviewPhotoUrls.map((url, index) => <div key={index} className="relative">
                              <img src={url} alt={`Review photo ${index + 1}`} className="w-full h-16 object-cover rounded border" />
                              <Button type="button" variant="destructive" size="sm" className="absolute -top-2 -right-2 h-6 w-6 p-0" onClick={() => removePhoto(index)}>
                                ×
                              </Button>
                            </div>)}
                        </div>}
                    </div>
                  </div>

                  <Button onClick={handleAddToRatings} disabled={isSubmittingReview || userRating === 0}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add to My Ratings
                  </Button>
                </CardContent>
              </Card>}

            {/* Google Reviews */}
            {place.reviews && place.reviews.length > 0 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Google Reviews
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleViewMoreReviews} className="flex items-center gap-1">
                        <ExternalLink className="h-4 w-4" />
                        View More Reviews
                      </Button>
                      <Select value={reviewSortBy} onValueChange={(value: 'recent' | 'helpful' | 'rating') => setReviewSortBy(value)}>
                        <SelectTrigger className="w-32">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="helpful">Most Helpful</SelectItem>
                          <SelectItem value="rating">Highest Rated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getSortedReviews().slice(0, showAllReviews ? getSortedReviews().length : 3).map((review, index) => <div key={index} className="border-b last:border-b-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{review.author_name}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.time * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{review.text}</p>
                    </div>)}
                  
                  {/* Show More/Less Reviews Button */}
                  {getSortedReviews().length > 3 && <div className="pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setShowAllReviews(!showAllReviews)} className="w-full">
                        {showAllReviews ? 'Show Less Reviews' : `Show All ${getSortedReviews().length} Google Reviews`}
                      </Button>
                    </div>}
                  
                  {/* Note about Google Reviews */}
                  <div className="pt-2 text-xs text-muted-foreground text-center">
                    Showing all available Google Reviews (up to {getSortedReviews().length} reviews)
                  </div>
                </CardContent>
              </Card>}
          </div>

          {/* Right Column - Map & Categories */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 rounded-lg overflow-hidden">
                  <GlobalSearchMap restaurants={[place]} onRestaurantClick={() => {}} center={{
                  lat: place.geometry.location.lat,
                  lng: place.geometry.location.lng
                }} />
                </div>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>
                  {aiCuisine && <div className="mb-2">
                      <Badge variant="secondary" className="text-sm">
                        {aiCuisine}
                      </Badge>
                    </div>}
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(aiCategories.length > 0 ? aiCategories : place.types).map(type => <Badge key={type} variant="outline">
                      {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>)}
                  {isLoadingAiAnalysis && <Badge variant="outline" className="animate-pulse">
                      Analyzing...
                    </Badge>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>;
}
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { Star, MapPin, Phone, Globe, Navigation, Clock, Heart, MessageSquare, Camera, Filter, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurants } from "@/contexts/RestaurantContext";
import { RestaurantDialog } from "./Dialog/RestaurantDialog";
import { RestaurantFormData } from "@/types/restaurant";
import { GlobalSearchMap } from "@/components/GlobalSearchMap";

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
  yelpData?: {
    id: string;
    url: string;
    categories: string[];
    price?: string;
    photos: string[];
    transactions: string[];
    menu_url?: string;
  };
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
  const {
    addRestaurant
  } = useRestaurants();
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
  const [isRestaurantDialogOpen, setIsRestaurantDialogOpen] = useState(false);
  const [enhancedRestaurantData, setEnhancedRestaurantData] = useState<any>(null);
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
    const searchQuery = `${place.name} reviews`;
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
        const {
          data: aiData
        } = await supabase.functions.invoke('ai-michelin-detector', {
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
        rating: undefined,
        categoryRatings: undefined,
        useWeightedRating: false,
        priceRange: place.price_level,
        michelinStars: michelinStars,
        notes: `Added from Global Search`,
        dateVisited: '',
        photos: [],
        isWishlist: true
      };
      await addRestaurant(restaurantFormData);
      toast.success('Added to wishlist!');
    } catch (error: any) {
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

    // Show loading and enhance data with AI
    toast.info('Analyzing restaurant with AI...');
    try {
      const enhanced = await getAIEnhancedRestaurantData();
      setEnhancedRestaurantData(enhanced);
      setIsRestaurantDialogOpen(true);
    } catch (error) {
      console.error('Error enhancing restaurant data:', error);
      toast.error('Failed to analyze restaurant, but you can still add it manually');
      setIsRestaurantDialogOpen(true);
    }
  };

  const handleRestaurantFormSubmit = async (data: RestaurantFormData) => {
    try {
      await addRestaurant(data);
      toast.success('Restaurant added to your ratings!');
      setIsRestaurantDialogOpen(false);
    } catch (error: any) {
      console.error('Error adding restaurant:', error);
      toast.error(`Failed to add restaurant: ${error.message || 'Unknown error'}`);
    }
  };

  // Create AI-enhanced restaurant data for the form
  const getAIEnhancedRestaurantData = async () => {
    console.log('Enhancing restaurant data with AI...');

    // Parse address components
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

    // Use AI to determine Michelin stars - keep it optional
    let michelinStars = undefined; // Start with undefined, not 0
    let enhancedCuisine = aiCuisine;
    let enhancedPriceRange = place.price_level;
    try {
      // Get Michelin stars using AI
      const {
        data: michelinData
      } = await supabase.functions.invoke('ai-michelin-detector', {
        body: {
          name: place.name,
          address: place.formatted_address,
          city: city,
          country: country,
          cuisine: aiCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
          notes: `${place.name} - Google rating: ${place.rating || 'N/A'}`
        }
      });
      if (michelinData && michelinData.michelinStars !== null && michelinData.michelinStars !== undefined) {
        // Only set if AI actually detected Michelin stars (not 0)
        michelinStars = michelinData.michelinStars > 0 ? michelinData.michelinStars : undefined;
        console.log('AI detected Michelin stars:', michelinStars);
      }
    } catch (error) {
      console.log('Could not determine Michelin stars with AI:', error);
    }
    return {
      name: place.name,
      address: place.formatted_address.split(',')[0]?.trim() || place.formatted_address,
      city: city,
      country: country,
      cuisine: enhancedCuisine || place.types.filter(type => !['establishment', 'point_of_interest', 'food'].includes(type))[0] || 'restaurant',
      priceRange: enhancedPriceRange || undefined,
      michelinStars: michelinStars,
      // This will be undefined if no Michelin stars
      notes: '',
      latitude: place.geometry?.location?.lat || undefined,
      longitude: place.geometry?.location?.lng || undefined,
      website: place.website || undefined,
      phone_number: place.formatted_phone_number || undefined,
      openingHours: place.opening_hours?.weekday_text?.join('\n') || undefined,
      photos: [],
      isWishlist: false
    };
  };

  // Keep the original function for backward compatibility
  const getPrefilledRestaurantData = async () => {
    return await getAIEnhancedRestaurantData();
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

  return <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0 rounded-lg overflow-hidden">
          <div className="sticky top-0 bg-background z-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <DialogTitle className="text-2xl font-bold">{place.name}</DialogTitle>
                {place.opening_hours?.open_now !== undefined && <Badge variant={place.opening_hours.open_now ? "default" : "destructive"} className="text-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {place.opening_hours.open_now ? "Open Now" : "Closed"}
                  </Badge>}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
          
          <div className="border-t border-border w-full"></div>
          
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              {/* Quick Stats */}
              <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                {place.rating && <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{place.rating}</div>
                    <div className="flex justify-center mb-1">
                      {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= Math.round(place.rating!) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {place.user_ratings_total} reviews
                    </div>
                  </div>}
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{getPriceDisplay(place.price_level)}</div>
                  <div className="text-xs text-muted-foreground">Price Level</div>
                </div>
                
                {aiCuisine && <div className="text-center">
                    <Badge variant="secondary" className="text-sm font-medium">{aiCuisine}</Badge>
                    <div className="text-xs text-muted-foreground mt-1">Cuisine</div>
                  </div>}
                
                {place.yelpData && <div className="text-center">
                    <Badge variant="outline" className="text-sm">
                      <Star className="h-3 w-3 mr-1" />
                      Yelp
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">Available</div>
                  </div>}
              </div>
              
              {/* Action Buttons */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleCallRestaurant} disabled={!place.formatted_phone_number} className="w-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </Button>
                  <Button variant="outline" onClick={handleGetDirections} className="w-full">
                    <Navigation className="h-4 w-4 mr-2" />
                    Directions
                  </Button>
                  <Button variant="outline" onClick={handleVisitWebsite} disabled={!place.website} className="w-full">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </Button>
                  <Button variant="outline" onClick={handleAddToWishlist} disabled={isAddingToWishlist || !user} className="w-full">
                    <Heart className="h-4 w-4 mr-2" />
                    Wishlist
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Address and Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">Address</div>
                        <div className="text-sm text-muted-foreground">{place.formatted_address}</div>
                      </div>
                    </div>
                    
                    {place.formatted_phone_number && <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">Phone</div>
                          <div className="text-sm text-muted-foreground">{place.formatted_phone_number}</div>
                        </div>
                      </div>}
                    
                    {place.website && <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">Website</div>
                          <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center">
                            {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      </div>}
                    
                    {place.opening_hours?.weekday_text && <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium">Opening Hours</div>
                          <div className="text-sm space-y-1">
                            {place.opening_hours.weekday_text.map((day, i) => (
                              <div key={i} className="text-muted-foreground">{day}</div>
                            ))}
                          </div>
                        </div>
                      </div>}
                  </CardContent>
                </Card>
                
                {/* Reviews Section */}
                {place.reviews && place.reviews.length > 0 && <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg">Reviews</CardTitle>
                      <Select value={reviewSortBy} onValueChange={(value) => setReviewSortBy(value as any)}>
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="helpful">Most Helpful</SelectItem>
                          <SelectItem value="rating">Highest Rated</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {getSortedReviews().slice(0, showAllReviews ? undefined : 3).map((review, i) => (
                          <div key={i} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium">{review.author_name}</div>
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{review.text}</p>
                            <div className="text-xs text-muted-foreground mt-2">
                              {new Date(review.time * 1000).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                        
                        {place.reviews.length > 3 && !showAllReviews && <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setShowAllReviews(true)}>
                            Show All Reviews ({place.reviews.length})
                          </Button>}
                        
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleViewMoreReviews}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          View more reviews on Google
                        </Button>
                      </div>
                    </CardContent>
                  </Card>}
                
                {/* Yelp Section if available */}
                {place.yelpData && <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Yelp Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {place.yelpData.price && <div>
                            <div className="font-medium">Yelp Price</div>
                            <div className="text-sm text-muted-foreground">{place.yelpData.price}</div>
                          </div>}
                        
                        {place.yelpData.categories && place.yelpData.categories.length > 0 && <div>
                            <div className="font-medium">Categories</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {place.yelpData.categories.map((category, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{category}</Badge>
                              ))}
                            </div>
                          </div>}
                        
                        {place.yelpData.transactions && place.yelpData.transactions.length > 0 && <div>
                            <div className="font-medium">Services</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {place.yelpData.transactions.map((transaction, i) => (
                                <Badge key={i} variant="outline" className="text-xs capitalize">{transaction}</Badge>
                              ))}
                            </div>
                          </div>}
                      </div>
                      
                      {place.yelpData.url && <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open(place.yelpData!.url, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          View on Yelp
                        </Button>}
                      
                      {place.yelpData.menu_url && <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.open(place.yelpData!.menu_url!, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          View Menu
                        </Button>}
                    </CardContent>
                  </Card>}
                
                {/* Add Your Review */}
                {user && <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Your Experience</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="font-medium">Rate This Restaurant</div>
                        <StarRating rating={userRating} onRatingChange={setUserRating} size="md" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="userReview">Add Your Review</Label>
                        <Textarea id="userReview" placeholder="Share your experience..." value={userReview} onChange={(e) => setUserReview(e.target.value)} className="min-h-[100px]" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Add Photos</Label>
                        <div className="flex flex-wrap gap-2">
                          {reviewPhotoUrls.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded overflow-hidden">
                              <img src={url} alt="review" className="w-full h-full object-cover" />
                              <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-black/70 text-white p-1 rounded-bl">
                                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          
                          {reviewPhotoUrls.length < 5 && <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:text-gray-500 hover:border-gray-400 transition-colors">
                              <Camera className="h-6 w-6" />
                              <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)} className="hidden" accept="image/*" multiple />
                            </button>}
                        </div>
                        <p className="text-xs text-muted-foreground">Upload up to 5 photos</p>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button onClick={handleAddToWishlist} variant="outline" disabled={isAddingToWishlist}>
                          <Heart className="h-4 w-4 mr-2" />
                          Add to Wishlist
                        </Button>
                        <Button onClick={handleAddToRatings} disabled={!user}>
                          <Star className="h-4 w-4 mr-2" />
                          Rate & Add to Collection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>}
              </div>
              
              {/* Map and Photos Column */}
              <div className="space-y-6">
                {/* Map */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Location</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 h-[250px] rounded-b-lg overflow-hidden">
                    <GlobalSearchMap
                      center={[place.geometry.location.lng, place.geometry.location.lat]}
                      zoom={14}
                      places={[place]}
                      interactive={true}
                      selectedPlaceId={place.place_id}
                    />
                  </CardContent>
                </Card>
                
                {/* AI-Generated categories */}
                {aiCategories && aiCategories.length > 0 && <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {aiCategories.map((category, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{category}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>}
                
                {/* Photos */}
                {place.yelpData?.photos && place.yelpData.photos.length > 0 && <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Photos</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 rounded-b-lg overflow-hidden">
                      <div className="grid grid-cols-2 gap-1">
                        {place.yelpData.photos.map((photo, i) => (
                          <div key={i} className="aspect-square overflow-hidden">
                            <img src={photo} alt={`${place.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isRestaurantDialogOpen && <RestaurantDialog
        isOpen={isRestaurantDialogOpen}
        onOpenChange={setIsRestaurantDialogOpen}
        onSave={handleRestaurantFormSubmit}
        dialogType="add"
        restaurant={enhancedRestaurantData}
        hideSearch={true}
      />}
    </>;
}
